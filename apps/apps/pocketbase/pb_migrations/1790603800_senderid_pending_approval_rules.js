/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('senderids');

    // Users may create only as Pending; only admins may change status.
    // Admins can list/manage every sender id for approval.
    collection.listRule =
      "userId = @request.auth.id || @request.auth.role = 'admin'";
    collection.viewRule =
      "userId = @request.auth.id || @request.auth.role = 'admin'";
    collection.createRule =
      "@request.auth.id != '' && (@request.body.status = 'Pending' || @request.body.status = '' || @request.body.status:isset = false || @request.auth.role = 'admin')";
    collection.updateRule =
      "(userId = @request.auth.id && @request.body.status:changed = false) || @request.auth.role = 'admin'";
    collection.deleteRule =
      "userId = @request.auth.id || @request.auth.role = 'admin'";

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('senderids');
    collection.listRule = 'userId = @request.auth.id';
    collection.viewRule = 'userId = @request.auth.id';
    collection.createRule = "@request.auth.id != ''";
    collection.updateRule = 'userId = @request.auth.id';
    collection.deleteRule = 'userId = @request.auth.id';
    app.save(collection);
  },
);
