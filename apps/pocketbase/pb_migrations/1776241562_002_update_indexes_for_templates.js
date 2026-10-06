/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("templates");
  collection.indexes.push("CREATE INDEX idx_templates_userId ON templates (userId)");
  collection.indexes.push("CREATE INDEX idx_templates_status ON templates (status)");
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("templates");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_templates_userId"));
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_templates_status"));
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})