/// <reference path="../pb_data/types.d.ts" />

// sms_logs — add exact-time delivery reporting fields for the International
// (Twilio) API path. These let the Reports UI and the public
// GET /api/v1/reports/:request_id endpoint surface precise sent / delivered /
// failed timestamps and the end-to-end delivery duration.
//
//   request_id                  — public handle returned to the API caller
//                                 (sms_<hex> for SMS sends, otp_<hex> for OTP
//                                 sends). Used to look up a report by id.
//   sent_at                     — when the API accepted the send (our clock)
//   delivered_at                — when the webhook received 'delivered'
//   failed_at                   — when the webhook received 'failed'/'undelivered'
//   twilio_date_sent            — Twilio's dateSent (best-effort)
//   twilio_date_updated         — Twilio's DateUpdated from the webhook
//   delivery_duration_seconds   — (delivered_at - sent_at) in seconds
//
// Domestic / SIM Base sending and its delivery behavior are untouched.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("sms_logs");

    collection.fields.add(new TextField({ name: "request_id", max: 64 }));
    collection.fields.add(new DateField({ name: "sent_at" }));
    collection.fields.add(new DateField({ name: "delivered_at" }));
    collection.fields.add(new DateField({ name: "failed_at" }));
    collection.fields.add(new DateField({ name: "twilio_date_sent" }));
    collection.fields.add(new DateField({ name: "twilio_date_updated" }));
    collection.fields.add(new NumberField({ name: "delivery_duration_seconds" }));

    collection.indexes = [
      ...(collection.indexes || []),
      "CREATE INDEX idx_sms_logs_request_id ON sms_logs (request_id)",
    ];

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("sms_logs");
    [
      "request_id",
      "sent_at",
      "delivered_at",
      "failed_at",
      "twilio_date_sent",
      "twilio_date_updated",
      "delivery_duration_seconds",
    ].forEach((name) => collection.fields.removeByName(name));
    collection.indexes = (collection.indexes || []).filter(
      (i) => !i.includes("idx_sms_logs_request_id"),
    );
    app.save(collection);
  },
);
