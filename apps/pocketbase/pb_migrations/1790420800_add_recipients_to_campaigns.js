/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('campaigns');

    // Store the per-recipient phone list (valid + invalid) directly on the
    // campaign record so reports can show which numbers a campaign targeted
    // without needing tens of thousands of child rows. Each entry is a compact
    // { p: "<phone>", v: <bool> } object (v = valid 10-digit number).
    if (collection.fields.getByName('recipients')) return;

    collection.fields.add(
      new JSONField({
        name: 'recipients',
      }),
    );
    app.save(collection);
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('campaigns');
      collection.fields.removeByName('recipients');
      app.save(collection);
    } catch (e) {
      if (e.message.includes('no rows in result set')) {
        console.log('Collection not found, skipping revert');
        return;
      }
      throw e;
    }
  },
);
