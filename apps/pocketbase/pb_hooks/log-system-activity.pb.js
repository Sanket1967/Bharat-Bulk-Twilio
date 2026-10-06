/// <reference path="../pb_data/types.d.ts" />
// Log campaign sent
onRecordAfterUpdateSuccess((e) => {
  // RecordEvent has no `e.collection` — resolve it from the record.
  if (e.record.collection().name === "campaigns") {
    const oldStatus = e.record.original().get("status");
    const newStatus = e.record.get("status");
    
    if (oldStatus !== "sent" && newStatus === "sent") {
      const logRecord = new Record($app.findCollectionByNameOrId("system_logs"));
      logRecord.set("user_id", e.record.get("created_by"));
      logRecord.set("action_type", "campaign_sent");
      logRecord.set("details", "Campaign '" + e.record.get("name") + "' (ID: " + e.record.id + ") was sent");
      $app.save(logRecord);
    }
  }
  e.next();
}, "campaigns");

// Log contact imported
onRecordAfterCreateSuccess((e) => {
  if (e.record.collection().name === "contacts") {
    const logRecord = new Record($app.findCollectionByNameOrId("system_logs"));
    logRecord.set("user_id", e.record.get("userId"));
    logRecord.set("action_type", "contact_imported");
    logRecord.set("details", "Contact '" + (e.record.get("name") || e.record.get("phone")) + "' (ID: " + e.record.id + ") was imported");
    $app.save(logRecord);
  }
  e.next();
}, "contacts");

// Log user created
onRecordAfterCreateSuccess((e) => {
  if (e.record.collection().name === "users") {
    const logRecord = new Record($app.findCollectionByNameOrId("system_logs"));
    logRecord.set("user_id", e.record.id);
    logRecord.set("action_type", "user_created");
    logRecord.set("details", "User account created with email: " + e.record.get("email"));
    $app.save(logRecord);
  }
  e.next();
}, "users");