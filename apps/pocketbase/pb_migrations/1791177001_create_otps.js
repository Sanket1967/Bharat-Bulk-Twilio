/// <reference path="../pb_data/types.d.ts" />

// otps — OTP verification records for the /api/v1/otp/* endpoints.
//
// The OTP itself is stored as a SHA-256 HASH (`otp_hash`), never plaintext.
// `request_id` is the public handle returned to the API caller. Records are
// owner-scoped for reads; writes/updates happen server-side only (Express
// superuser client) so verification logic stays trusted.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    let collection;
    try {
      collection = app.findCollectionByNameOrId("otps");
    } catch (_) {
      collection = new Collection({
        type: "base",
        name: "otps",
        listRule: "user_id = @request.auth.id",
        viewRule: "user_id = @request.auth.id",
        createRule: "@request.auth.id != '' && @request.auth.id = @request.body.user_id",
        // Verification/expiry updates happen server-side only.
        updateRule: null,
        deleteRule: "user_id = @request.auth.id",
        fields: [
          { name: "request_id", type: "text", required: true, max: 64 },
          {
            name: "user_id",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: users.id,
            cascadeDelete: true,
          },
          { name: "to", type: "text", required: true, max: 32 },
          // SHA-256 hash of the 6-digit OTP.
          { name: "otp_hash", type: "text", required: true, max: 128 },
          { name: "expires_at", type: "date", required: true },
          { name: "verified", type: "bool" },
          { name: "attempts", type: "number" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE UNIQUE INDEX idx_otps_request_id ON otps (request_id)",
          "CREATE INDEX idx_otps_user ON otps (user_id)",
        ],
      });
      app.save(collection);
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId("otps");
      app.delete(collection);
    } catch (e) {
      if (e.message.includes("no rows in result set")) return;
      throw e;
    }
  },
);
