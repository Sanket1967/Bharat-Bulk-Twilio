/// <reference path="../pb_data/types.d.ts" />

// sms_logs — per-SMS delivery log for the Twilio reseller path. Owner-scoped:
// a user only ever sees their own logs. Writes happen server-side (Express
// superuser client) so the create/update rules can stay restrictive.
migrate(
  (app) => {
    let collection;
    try {
      collection = app.findCollectionByNameOrId("sms_logs");
    } catch (_) {
      collection = new Collection({
        type: "base",
        name: "sms_logs",
        listRule: "user_id = @request.auth.id",
        viewRule: "user_id = @request.auth.id",
        createRule:
          "@request.auth.id != '' && @request.auth.id = @request.body.user_id",
        // Status updates happen server-side (webhook / report sync), so deny
        // direct user updates.
        updateRule: null,
        deleteRule: "user_id = @request.auth.id",
        fields: [
          { name: "user_id", type: "text", required: true },
          { name: "to", type: "text", required: true },
          { name: "message", type: "text" },
          { name: "from_number", type: "text" },
          { name: "twilio_sid", type: "text" },
          {
            name: "status",
            type: "select",
            maxSelect: 1,
            values: ["queued", "sent", "delivered", "failed"],
          },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE INDEX idx_sms_logs_user ON sms_logs (user_id)",
          "CREATE INDEX idx_sms_logs_sid ON sms_logs (twilio_sid)",
        ],
      });
      app.save(collection);
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId("sms_logs");
      app.delete(collection);
    } catch (e) {
      if (e.message.includes("no rows in result set")) return;
      throw e;
    }
  },
);
