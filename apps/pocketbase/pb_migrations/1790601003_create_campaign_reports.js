/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const campaigns = app.findCollectionByNameOrId("campaigns");

    // Idempotent: reuse the collection if it already exists.
    let collection;
    try {
      collection = app.findCollectionByNameOrId("campaign_reports");
    } catch (_) {
      collection = new Collection({
        type: "base",
        name: "campaign_reports",
        // Owner-scoped via the campaign relation (campaigns.created_by holds
        // the owning user id as text). Server-side superuser writes bypass
        // these rules; the frontend reads its own campaigns' reports.
        listRule: "campaign_id.created_by = @request.auth.id",
        viewRule: "campaign_id.created_by = @request.auth.id",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: "campaign_id",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: campaigns.id,
            cascadeDelete: true,
          },
          { name: "phone_number", type: "text", required: true, max: 32 },
          {
            name: "status",
            type: "select",
            maxSelect: 1,
            values: [
              "PENDING",
              "QUEUED",
              "SENT",
              "DELIVERED",
              "FAILED",
              "DND",
              "INVALID",
              "SKIPPED_DUE_TO_CAP",
            ],
          },
          { name: "operator_message_id", type: "text", max: 64 },
          { name: "dlr_status", type: "text", max: 32 },
          { name: "created_at", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated_at", type: "autodate", onCreate: true, onUpdate: true },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(collection);
      return;
    }

    // Already exists — ensure fields are present.
    const ensure = (name, factory) => {
      if (!collection.fields.getByName(name)) {
        collection.fields.add(factory());
      }
    };
    ensure("campaign_id", () => new RelationField({ name: "campaign_id", required: true, maxSelect: 1, collectionId: campaigns.id, cascadeDelete: true }));
    ensure("phone_number", () => new TextField({ name: "phone_number", required: true, max: 32 }));
    ensure("operator_message_id", () => new TextField({ name: "operator_message_id", max: 64 }));
    ensure("dlr_status", () => new TextField({ name: "dlr_status", max: 32 }));
    ensure("created_at", () => new AutodateField({ name: "created_at", onCreate: true, onUpdate: false }));
    ensure("updated_at", () => new AutodateField({ name: "updated_at", onCreate: true, onUpdate: true }));
    app.save(collection);
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId("campaign_reports");
      app.delete(collection);
    } catch (_) {}
  },
);
