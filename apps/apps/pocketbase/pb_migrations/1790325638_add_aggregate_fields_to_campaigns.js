/// <reference path="../pb_data/types.d.ts" />
// Add per-campaign aggregate delivery counters so a bulk send (50k+ recipients)
// is stored as ONE campaign record instead of one message + one delivery_log
// row per recipient. This makes sending and reporting instant at any volume.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("campaigns");

    collection.fields.add(new NumberField({ name: "total_recipients" }));
    collection.fields.add(new NumberField({ name: "valid_count" }));
    collection.fields.add(new NumberField({ name: "invalid_count" }));
    collection.fields.add(new NumberField({ name: "sms_parts" }));
    collection.fields.add(new NumberField({ name: "credits_used" }));
    collection.fields.add(new NumberField({ name: "pending_count" }));
    collection.fields.add(new NumberField({ name: "sent_count" }));
    collection.fields.add(new NumberField({ name: "completed_count" }));
    collection.fields.add(new NumberField({ name: "failed_count" }));

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("campaigns");
    [
      "total_recipients",
      "valid_count",
      "invalid_count",
      "sms_parts",
      "credits_used",
      "pending_count",
      "sent_count",
      "completed_count",
      "failed_count",
    ].forEach((name) => collection.fields.removeByName(name));
    app.save(collection);
  },
);
