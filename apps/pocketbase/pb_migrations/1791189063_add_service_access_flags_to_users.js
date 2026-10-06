/// <reference path="../pb_data/types.d.ts" />

// Service-access permission flags on the users auth collection.
//
//   can_use_international — Twilio sub-account route (24/7, worldwide)
//   can_use_domestic      — SIM Base / SMPP route (India, 10AM–6PM)
//   is_api_enabled        — gates API Keys + API Docs menu access
//
// Defaults for EXISTING users: domestic on (preserve current access),
// international on only for users who already have a Twilio sub-account
// provisioned, API off. New signups get the field defaults (domestic true,
// international false, api false) because the locked createRule forbids
// non-admins from setting these flags.
//
// These are privileged fields. The updateRule is tightened so a member
// cannot self-grant access, and the createRule forbids non-admins from
// setting them at signup. Only role='admin' may toggle them.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    if (!users.fields.getByName("can_use_international")) {
      users.fields.add(new BoolField({ name: "can_use_international" }));
    }
    if (!users.fields.getByName("can_use_domestic")) {
      users.fields.add(new BoolField({ name: "can_use_domestic" }));
    }
    if (!users.fields.getByName("is_api_enabled")) {
      users.fields.add(new BoolField({ name: "is_api_enabled" }));
    }

    // Lock the three new privileged flags in addition to the existing
    // sms_credits / sub-account locks. Only admins may change them.
    users.updateRule =
      "(id = @request.auth.id && @request.body.sms_credits:changed = false && @request.body.sub_account_sid:changed = false && @request.body.sub_account_auth_token:changed = false && @request.body.can_use_international:changed = false && @request.body.can_use_domestic:changed = false && @request.body.is_api_enabled:changed = false) || @request.auth.role = 'admin'";

    // Public signup stays open, but non-admins cannot set the privileged
    // flags — the field defaults apply instead (domestic=true, others false).
    users.createRule =
      "(@request.body.can_use_international:isset = false && @request.body.can_use_domestic:isset = false && @request.body.is_api_enabled:isset = false) || @request.auth.role = 'admin'";

    app.save(users);

    // Backfill defaults for existing users. Bool fields default to false
    // when first added, so set domestic=true for everyone and international
    // = true only for users who already have a Twilio sub-account. Use raw
    // SQL to bypass per-record validation (some legacy users have blank
    // required fields like mobile_number that would block a wrapper save).
    app.db()
      .newQuery(
        "UPDATE users SET can_use_domestic = 1, can_use_international = CASE WHEN sub_account_sid IS NOT NULL AND sub_account_sid != '' THEN 1 ELSE 0 END, is_api_enabled = 0",
      )
      .execute();
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    try {
      users.fields.removeByName("can_use_international");
    } catch (_) {}
    try {
      users.fields.removeByName("can_use_domestic");
    } catch (_) {}
    try {
      users.fields.removeByName("is_api_enabled");
    } catch (_) {}
    // Restore the previous rules.
    users.updateRule =
      "(id = @request.auth.id && @request.body.sms_credits:changed = false && @request.body.sub_account_sid:changed = false && @request.body.sub_account_auth_token:changed = false) || @request.auth.role = 'admin'";
    users.createRule = "";
    app.save(users);
  },
);
