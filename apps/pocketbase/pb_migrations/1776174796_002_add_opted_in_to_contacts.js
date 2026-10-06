/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("contacts");

  const existing = collection.fields.getByName("opted_in");
  if (existing) {
    if (existing.type === "bool") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("opted_in"); // exists with wrong type, remove first
  }

  collection.fields.add(new BoolField({
    name: "opted_in",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("contacts");
  collection.fields.removeByName("opted_in");
  return app.save(collection);
})