/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('messages');
    const field = collection.fields.getByName('contact_id');
    if (field) {
      field.required = false;
      app.save(collection);
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('messages');
    const field = collection.fields.getByName('contact_id');
    if (field) {
      field.required = true;
      app.save(collection);
    }
  },
);
