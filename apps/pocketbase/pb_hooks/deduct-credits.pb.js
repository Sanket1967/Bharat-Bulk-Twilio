/// <reference path="../pb_data/types.d.ts" />
// Deduct credits when a campaign transitions to "sent" (covers scheduled → sent
// and draft → sent). Immediate sends are created directly with status "sent" and
// are deducted in the frontend, so this hook only covers the update path.
// Credits are charged per SMS part (160 chars each) for every VALID recipient
// only; the per-campaign aggregate (valid_count * sms_parts) is precomputed at
// create time and stored as credits_used, so no per-recipient rows are needed.
onRecordAfterUpdateSuccess((e) => {
  // RecordEvent has no `e.collection` — resolve it from the record.
  if (e.record.collection().name === "campaigns") {
    const oldStatus = e.record.original().get("status");
    const newStatus = e.record.get("status");

    if (oldStatus !== "sent" && newStatus === "sent") {
      const campaignId = e.record.id;
      const userId = e.record.get("created_by");
      var creditsToDeduct = e.record.get("credits_used") || 0;

      // Fallback: compute from aggregates if credits_used was not stored.
      if (creditsToDeduct <= 0) {
        var validCount = e.record.get("valid_count") || 0;
        var smsParts = e.record.get("sms_parts") || 1;
        creditsToDeduct = validCount * smsParts;
      }

      if (creditsToDeduct > 0) {
        try {
          var user = $app.findRecordById("users", userId);
          var currentCredits = user.get("credits") || 0;

          // Credit guard: if the user does not have enough credits to send
          // this campaign, hold it as a draft instead of deducting and going
          // negative. The campaign stays on hold until credits are added.
          if (creditsToDeduct > currentCredits) {
            e.record.set("status", "draft");
            $app.save(e.record);
            $app.logger().error(
              "campaign held for insufficient credits",
              "campaign", campaignId,
              "needed", creditsToDeduct,
              "available", currentCredits,
            );
            e.next();
            return;
          }

          user.set("credits", currentCredits - creditsToDeduct);
          $app.save(user);

          var logRecord = new Record($app.findCollectionByNameOrId("user_credits_log"));
          logRecord.set("user_id", userId);
          logRecord.set("action", "spent");
          logRecord.set("amount", creditsToDeduct);
          logRecord.set("campaign_id", campaignId);
          $app.save(logRecord);
        } catch (err) {
          $app.logger().error("credit deduction failed", "campaign", campaignId, "err", String(err));
        }
      }
    }
  }
  e.next();
}, "campaigns");
