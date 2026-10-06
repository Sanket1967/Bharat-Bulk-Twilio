/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const campaigns = app.findCollectionByNameOrId("campaigns");

    let existing = null;
    try {
      existing = app.findCollectionByNameOrId("campaign_recipient_chunks");
    } catch (_) {
      existing = null;
    }
    if (existing) return;

    const collection = new Collection({
      type: "base",
      name: "campaign_recipient_chunks",
      listRule: "user_id = @request.auth.id || @request.auth.role = 'admin'",
      viewRule: "user_id = @request.auth.id || @request.auth.role = 'admin'",
      createRule:
        "@request.auth.id != '' && @request.auth.id = @request.body.user_id",
      updateRule: "user_id = @request.auth.id || @request.auth.role = 'admin'",
      deleteRule: "user_id = @request.auth.id || @request.auth.role = 'admin'",
      fields: [
        {
          name: "campaign_id",
          type: "relation",
          required: true,
          maxSelect: 1,
          collectionId: campaigns.id,
          cascadeDelete: true,
        },
        { name: "user_id", type: "text", required: true },
        { name: "chunk_index", type: "number", onlyInt: true },
        { name: "phones", type: "json" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE INDEX idx_crc_campaign ON campaign_recipient_chunks (campaign_id)",
        "CREATE INDEX idx_crc_user ON campaign_recipient_chunks (user_id)",
      ],
    });
    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("campaign_recipient_chunks");
    app.delete(collection);
  },
);
