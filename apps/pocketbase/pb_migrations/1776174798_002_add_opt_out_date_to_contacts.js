/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("contacts");

  const existing = collection.fields.getByName("opt_out_date");
  if (existing) {
    if (existing.type === "date") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("opt_out_date"); // exists with wrong type, remove first
  }

  collection.fields.add(new DateField({
    name: "opt_out_date",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("contacts");
  collection.fields.removeByName("opt_out_date");
  return app.save(collection);
})