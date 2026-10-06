/// <reference path="../pb_data/types.d.ts" />

// Default service-access flags for new users.
//
// BoolField has no configurable default (always false), so without this hook
// public signups would get can_use_domestic=false and be unable to use the
// domestic SMS product. The createRule on `users` forbids non-admins from
// setting these flags in the request body, so for public signups the body
// never contains them — we set safe defaults here server-side.
//
// Admin-created users set the flags explicitly via the AddNewUser modal, so
// we only enforce defaults when the caller is NOT an admin.
onRecordCreateRequest((e) => {
  const auth = e.requestInfo.auth;
  const isAdmin = !!auth && auth.get("role") === "admin";

  if (!isAdmin) {
    e.record.set("can_use_domestic", true);
    e.record.set("can_use_international", false);
    e.record.set("is_api_enabled", false);
  }

  e.next();
}, "users");
