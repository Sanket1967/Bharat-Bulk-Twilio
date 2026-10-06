/// <reference path="../pb_data/types.d.ts" />

// api_keys — per-user API keys for the REST SMS/OTP API (v1).
//
// The `api_key` field stores a SHA-256 HASH of the plaintext key, never the
// plaintext itself. The plaintext (`bb_live_<random>`) is returned to the
// caller exactly once at creation/regeneration time and cannot be recovered.
// `key_prefix` holds the first ~14 chars for masked display in the UI.
//
// Owner-scoped: a user only sees/manages their own keys. Writes also happen
// server-side (Express superuser client) for create/regenerate so the hash is
// computed in a trusted context.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    let collection;
    try {
      collection = app.findCollectionByNameOrId("api_keys");
    } catch (_) {
      collection = new Collection({
        type: "base",
        name: "api_keys",
        listRule: "user_id = @request.auth.id",
        viewRule: "user_id = @request.auth.id",
        createRule: "@request.auth.id != '' && @request.auth.id = @request.body.user_id",
        updateRule: "user_id = @request.auth.id",
        deleteRule: "user_id = @request.auth.id",
        fields: [
          {
            name: "user_id",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: users.id,
            cascadeDelete: true,
          },
          { name: "name", type: "text", max: 80 },
          // SHA-256 hash of the plaintext key. Looked up by hashing the
          // incoming x-api-key header.
          { name: "api_key", type: "text", required: true, max: 128 },
          // Masked prefix for display, e.g. "bb_live_a1b2c3..."
          { name: "key_prefix", type: "text", max: 40 },
          { name: "is_active", type: "bool" },
          { name: "last_used", type: "date" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE UNIQUE INDEX idx_api_keys_hash ON api_keys (api_key)",
          "CREATE INDEX idx_api_keys_user ON api_keys (user_id)",
        ],
      });
      app.save(collection);
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId("api_keys");
      app.delete(collection);
    } catch (e) {
      if (e.message.includes("no rows in result set")) return;
      throw e;
    }
  },
);
