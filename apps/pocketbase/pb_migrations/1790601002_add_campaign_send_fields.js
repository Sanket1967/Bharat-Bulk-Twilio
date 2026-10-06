/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("campaigns");

    const addNum = (name) => {
      const existing = collection.fields.getByName(name);
      if (existing) {
        if (existing.type() === "number") return;
        collection.fields.removeByName(name);
      }
      collection.fields.add(new NumberField({ name, required: false, onlyInt: true }));
    };

    addNum("total_numbers");
    addNum("actual_sent_count");
    addNum("delivery_percentage_applied");

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("campaigns");
    for (const name of ["total_numbers", "actual_sent_count", "delivery_percentage_applied"]) {
      try { collection.fields.removeByName(name); } catch (_) {}
    }
    app.save(collection);
  },
);
