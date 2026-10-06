/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("senderids");
  collection.indexes.push("CREATE INDEX idx_senderids_userId ON senderids (userId)");
  collection.indexes.push("CREATE INDEX idx_senderids_status ON senderids (status)");
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("senderids");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_senderids_userId"));
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_senderids_status"));
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})