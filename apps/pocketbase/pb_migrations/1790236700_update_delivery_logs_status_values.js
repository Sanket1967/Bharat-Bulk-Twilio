/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("delivery_logs");
  if (!collection) {
    console.log("delivery_logs collection not found, skipping");
    return;
  }

  // Replace the status select with an expanded value set so the campaign
  // delivery report can use the pending -> sent -> completed progression.
  collection.fields.removeByName("status");
  collection.fields.add(new SelectField({
    name: "status",
    required: false,
    values: ["pending", "queued", "sent", "delivered", "completed", "failed"],
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("delivery_logs");
  if (!collection) return;
  collection.fields.removeByName("status");
  collection.fields.add(new SelectField({
    name: "status",
    required: false,
    values: ["queued", "sent", "failed", "delivered"],
  }));
  return app.save(collection);
});
