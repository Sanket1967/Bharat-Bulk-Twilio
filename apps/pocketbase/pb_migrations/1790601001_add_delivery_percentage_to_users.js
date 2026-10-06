/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("users");

    const existing = collection.fields.getByName("delivery_percentage");
    if (existing) {
      if (existing.type() === "number") return; // correct type already
      collection.fields.removeByName("delivery_percentage");
    }

    collection.fields.add(
      new NumberField({
        name: "delivery_percentage",
        required: false,
        onlyInt: true,
        min: 1,
        max: 100,
      }),
    );
    app.save(collection);

    // Backfill existing users to the default 100.
    const users = app.findAllRecords(collection);
    for (const u of users) {
      if (u.get("delivery_percentage") === null || u.get("delivery_percentage") === "" || Number.isNaN(Number(u.get("delivery_percentage")))) {
        u.set("delivery_percentage", 100);
        app.save(u);
      }
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("users");
    collection.fields.removeByName("delivery_percentage");
    app.save(collection);
  },
);
