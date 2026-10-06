/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("contacts");
  collection.listRule = "userId = @request.auth.id && opted_in = true";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("contacts");
  collection.listRule = "userId = @request.auth.id";
  return app.save(collection);
})