/// <reference path="../pb_data/types.d.ts" />

// Adds audit fields to user_credits_log so admin fund transfers record which
// credit balance they affected (domestic `credits` vs international
// `sms_credits`), a free-text remark, and the per-SMS unit rate.
migrate(
  (app) => {
    const log = app.findCollectionByNameOrId("user_credits_log");

    if (!log.fields.getByName("credit_type")) {
      log.fields.add(
        new TextField({
          name: "credit_type",
          max: 32,
        }),
      );
    }

    if (!log.fields.getByName("remarks")) {
      log.fields.add(
        new TextField({
          name: "remarks",
        }),
      );
    }

    if (!log.fields.getByName("unit_per_sms")) {
      log.fields.add(
        new NumberField({
          name: "unit_per_sms",
        }),
      );
    }

    app.save(log);
  },
  (app) => {
    const log = app.findCollectionByNameOrId("user_credits_log");
    log.fields.removeByName("credit_type");
    log.fields.removeByName("remarks");
    log.fields.removeByName("unit_per_sms");
    app.save(log);
  },
);
