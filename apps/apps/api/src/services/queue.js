// In-memory SMS send queue with TPS rate limiting and per-user delivery
// percentage (cap) logic.
//
// addToQueue(campaignId, numbers[], message):
//   - reads the campaign + owning user
//   - applies delivery_percentage cap: only ceil(n * pct / 100) randomly
//     chosen numbers are actually sent via SMPP; the rest are recorded as
//     SKIPPED_DUE_TO_CAP and never submitted to the SMSC.
//   - inserts a campaign_reports row for EVERY number (sent + skipped)
//   - updates the campaign aggregate fields (total_numbers, actual_sent_count,
//     delivery_percentage_applied) and the per-recipient recipients JSON
//   - enqueues the to-send numbers and starts processQueue()
//
// processQueue() drains the queue at SMPP_TPS submits per second.
import pocketbaseClient from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { sendSms, getStatus } from './smppService.js';

const TPS = parseInt(process.env.SMPP_TPS || '50', 10);
// Hard cap on campaign_reports rows created per campaign — beyond this the
// per-recipient status still lives on the campaign.recipients JSON, so reports
// stay instant even for 50k sends without flooding PocketBase.
const REPORT_ROWS_CAP = 10000;
const REPORT_BATCH = 50;

const queue = [];
let processing = false;

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

async function batchCreateReports(rows) {
  // Create in small concurrent batches; stop after the cap so very large
  // campaigns don't overwhelm PocketBase (the recipients JSON still holds
  // per-recipient status for every number).
  const capped = rows.slice(0, REPORT_ROWS_CAP);
  for (let i = 0; i < capped.length; i += REPORT_BATCH) {
    const chunk = capped.slice(i, i + REPORT_BATCH);
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(
      chunk.map((r) =>
        pocketbaseClient
          .collection('campaign_reports')
          .create(r, { $autoCancel: false })
          .catch((e) => logger.warn('campaign_reports create failed:', String(e))),
      ),
    );
  }
}

async function updateReportByPhone(campaignId, phone, patch) {
  try {
    const rows = await pocketbaseClient
      .collection('campaign_reports')
      .getFullList({
        filter: `campaign_id = "${campaignId}" && phone_number = "${phone}"`,
        $autoCancel: false,
      });
    if (rows.length) {
      await pocketbaseClient.collection('campaign_reports').update(
        rows[0].id,
        { ...patch, updated_at: new Date().toISOString() },
        { $autoCancel: false },
      );
    }
  } catch (e) {
    logger.warn('updateReportByPhone failed:', String(e));
  }
}

async function updateRecipientStatus(campaignId, phone, status) {
  try {
    const campaign = await pocketbaseClient
      .collection('campaigns')
      .getOne(campaignId, { $autoCancel: false });
    const recipients = Array.isArray(campaign.recipients) ? campaign.recipients : [];
    // Chunked campaigns keep numbers off this row. Rewriting an empty
    // recipients blob on every submit would stall a 50k send.
    if (!recipients.length) return;
    const updated = recipients.map((r) => (r && r.p === phone ? { ...r, s: status } : r));
    await pocketbaseClient.collection('campaigns').update(
      campaignId,
      { recipients: updated },
      { $autoCancel: false },
    );
  } catch (e) {
    logger.warn('updateRecipientStatus failed:', String(e));
  }
}

async function stampChunkStatuses(campaignId, skippedSet) {
  try {
    const chunks = await pocketbaseClient
      .collection('campaign_recipient_chunks')
      .getFullList({
        filter: `campaign_id = "${campaignId}"`,
        sort: 'chunk_index',
        $autoCancel: false,
      });
    for (const chunk of chunks) {
      const phones = Array.isArray(chunk.phones) ? chunk.phones : [];
      const next = phones.map((r) => {
        if (!r) return r;
        if (skippedSet.has(r.p)) return { ...r, s: 'SKIPPED_DUE_TO_CAP' };
        if (r.v === false) return { ...r, s: 'INVALID' };
        return { ...r, s: 'QUEUED' };
      });
      // eslint-disable-next-line no-await-in-loop
      await pocketbaseClient.collection('campaign_recipient_chunks').update(
        chunk.id,
        { phones: next },
        { $autoCancel: false },
      );
    }
  } catch (e) {
    logger.warn('stampChunkStatuses failed:', String(e));
  }
}

export async function loadStoredRecipients(campaign) {
  const inline = Array.isArray(campaign?.recipients) ? campaign.recipients : [];
  if (inline.length) return inline;
  try {
    const chunks = await pocketbaseClient
      .collection('campaign_recipient_chunks')
      .getFullList({
        filter: `campaign_id = "${campaign.id}"`,
        sort: 'chunk_index',
        $autoCancel: false,
      });
    return chunks.flatMap((chunk) => (Array.isArray(chunk.phones) ? chunk.phones : []));
  } catch (e) {
    logger.warn('loadStoredRecipients failed:', String(e));
    return [];
  }
}

export async function addToQueue(campaignId, numbers, message) {
  const cleanNumbers = (numbers || [])
    .map((n) => String(n).trim())
    .filter(Boolean);

  if (!cleanNumbers.length) {
    return { total: 0, toSend: 0, skipped: 0, pct: 100 };
  }

  const campaign = await pocketbaseClient
    .collection('campaigns')
    .getOne(campaignId, { $autoCancel: false });
  const userId = campaign.created_by;

  // Per-user delivery percentage cap (default 100).
  let pct = 100;
  try {
    const user = await pocketbaseClient
      .collection('users')
      .getOne(userId, { $autoCancel: false });
    pct = Math.max(1, Math.min(100, parseInt(user.delivery_percentage || 100, 10) || 100));
  } catch (e) {
    logger.warn('queue: user load failed, defaulting to 100%:', String(e));
  }

  const toSendCount = Math.ceil((cleanNumbers.length * pct) / 100);
  const shuffled = shuffle(cleanNumbers);
  const toSend = shuffled.slice(0, toSendCount);
  const skipped = shuffled.slice(toSendCount);
  const skippedSet = new Set(skipped);

  // Campaign aggregate fields drive the report's 3 boxes.
  await pocketbaseClient.collection('campaigns').update(
    campaignId,
    {
      total_numbers: cleanNumbers.length,
      actual_sent_count: toSend.length,
      delivery_percentage_applied: pct,
    },
    { $autoCancel: false },
  );

  // Per-recipient status. Inline JSON for older campaigns; chunk rows for
  // large sends (do not write an empty recipients blob back).
  const inlineRecipients = Array.isArray(campaign.recipients) ? campaign.recipients : [];
  if (inlineRecipients.length) {
    const recipients = inlineRecipients.map((r) => {
      if (!r) return r;
      if (skippedSet.has(r.p)) return { ...r, s: 'SKIPPED_DUE_TO_CAP' };
      if (r.v === false) return { ...r, s: 'INVALID' };
      return { ...r, s: 'QUEUED' };
    });
    await pocketbaseClient.collection('campaigns').update(
      campaignId,
      { recipients },
      { $autoCancel: false },
    );
  } else {
    await stampChunkStatuses(campaignId, skippedSet);
  }

  // One campaign_reports row per number (sent + skipped).
  const reportRows = cleanNumbers.map((p) => ({
    campaign_id: campaignId,
    phone_number: p,
    status: skippedSet.has(p) ? 'SKIPPED_DUE_TO_CAP' : 'QUEUED',
  }));
  // Don't block the response on row creation for huge campaigns.
  batchCreateReports(reportRows).catch((e) =>
    logger.warn('batchCreateReports background failed:', String(e)),
  );

  // Enqueue only the to-send numbers for SMPP submission.
  for (const phone of toSend) {
    queue.push({ campaignId, phone, message });
  }
  if (!processing) {
    processQueue().catch((e) => logger.error('processQueue crashed:', String(e)));
  }

  logger.info(
    `queue: campaign=${campaignId} total=${cleanNumbers.length} toSend=${toSend.length} skipped=${skipped.length} pct=${pct}`,
  );

  return { total: cleanNumbers.length, toSend: toSend.length, skipped: skipped.length, pct };
}

async function sendOne({ campaignId, phone, message }) {
  const { state } = getStatus();
  if (state !== 'CONNECTED') {
    // SMPP unavailable — leave as QUEUED so it can be retried on reconnect.
    // Still reflect on the recipients JSON so the report is accurate.
    await updateRecipientStatus(campaignId, phone, 'QUEUED');
    return;
  }
  await new Promise((resolve) => {
    sendSms(phone, message, async (err, { messageId } = {}) => {
      if (err) {
        await updateReportByPhone(campaignId, phone, { status: 'FAILED', dlr_status: String(err.message) });
        await updateRecipientStatus(campaignId, phone, 'FAILED');
      } else {
        await updateReportByPhone(campaignId, phone, {
          status: 'SENT',
          operator_message_id: messageId || '',
        });
        await updateRecipientStatus(campaignId, phone, 'SENT');
      }
      resolve();
    });
  });
}

export async function processQueue() {
  if (processing) return;
  processing = true;
  try {
    while (queue.length > 0) {
      const batch = queue.splice(0, TPS);
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(batch.map((item) => sendOne(item)));
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 1000));
    }
  } finally {
    processing = false;
  }
}

export function queueLength() {
  return queue.length;
}
