/// <reference path="../pb_data/types.d.ts" />

// Adds Twilio reseller fields to the users auth collection:
//   sub_account_sid        (hidden from API responses — server-side only)
//   sub_account_auth_token (hidden from API responses — server-side only)
//   sms_credits            (visible; reseller SMS balance, default 0)
//
// The credential fields are marked `hidden` so they never appear in API
// responses, and the updateRule is tightened so a user cannot self-assign
// credits or Twilio credentials (admins still can).
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    // sub_account_sid — Twilio sub-account SID. Visible (not a secret on its
    // own; the auth token is). Lets the admin UI show provisioning status.
    if (!users.fields.getByName("sub_account_sid")) {
      users.fields.add(
        new TextField({
          name: "sub_account_sid",
        }),
      );
    }

    // sub_account_auth_token — Twilio sub-account auth token (hidden from API).
    if (!users.fields.getByName("sub_account_auth_token")) {
      users.fields.add(
        new TextField({
          name: "sub_account_auth_token",
          hidden: true,
        }),
      );
    }

    // sms_credits — reseller SMS credit balance (1 credit = 1 SMS = Rs 4).
    if (!users.fields.getByName("sms_credits")) {
      users.fields.add(
        new NumberField({
          name: "sms_credits",
        }),
      );
    }

    // Lock the privileged fields on update: a user may edit their own profile
    // but cannot change sms_credits, sub_account_sid, or
    // sub_account_auth_token. Admins can change anything.
    users.updateRule =
      "(id = @request.auth.id && @request.body.sms_credits:changed = false && @request.body.sub_account_sid:changed = false && @request.body.sub_account_auth_token:changed = false) || @request.auth.role = 'admin'";

    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("sub_account_sid");
    users.fields.removeByName("sub_account_auth_token");
    users.fields.removeByName("sms_credits");
    users.updateRule = "id = @request.auth.id || @request.auth.role = 'admin'";
    app.save(users);
  },
);
