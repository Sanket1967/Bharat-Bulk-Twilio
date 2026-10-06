/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("smpp_settings");
  collection.indexes.push("CREATE INDEX idx_smpp_settings_userId ON smpp_settings (userId)");
  collection.indexes.push("CREATE INDEX idx_smpp_settings_lastConnectionStatus ON smpp_settings (lastConnectionStatus)");
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("smpp_settings");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_smpp_settings_userId"));
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_smpp_settings_lastConnectionStatus"));
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})