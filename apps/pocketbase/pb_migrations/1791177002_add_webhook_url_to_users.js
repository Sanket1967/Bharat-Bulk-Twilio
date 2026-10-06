/// <reference path="../pb_data/types.d.ts" />

// Adds `webhook_url` to the users auth collection. When set, Twilio delivery
// status callbacks (delivered/failed) for that user's messages are forwarded
// to this URL via POST. The field is not privileged — users may set/clear
// their own webhook URL. The existing updateRule already permits self-edits
// except for the locked credential/credit fields.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    if (!users.fields.getByName("webhook_url")) {
      users.fields.add(
        new URLField({
          name: "webhook_url",
        }),
      );
      app.save(users);
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    if (users.fields.getByName("webhook_url")) {
      users.fields.removeByName("webhook_url");
      app.save(users);
    }
  },
);
