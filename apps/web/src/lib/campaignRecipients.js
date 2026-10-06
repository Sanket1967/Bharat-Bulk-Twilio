import pb from '@/lib/pocketbaseClient';

// Keep each write well under typical reverse-proxy body limits (~1MB).
export const RECIPIENT_CHUNK_SIZE = 800;

export function explainCampaignError(error) {
  const status = error?.status;
  const data = error?.response?.data || error?.data;
  if (data && typeof data === 'object') {
    const bits = [];
    for (const [key, val] of Object.entries(data)) {
      if (!val || key === 'message') continue;
      const message = typeof val === 'object' ? val.message : String(val);
      if (message) bits.push(`${key}: ${message}`);
    }
    if (bits.length) {
      return `Campaign was rejected. ${bits.join(' ')}`;
    }
  }
  if (status === 401 || status === 403) {
    return 'You are not allowed to send this campaign. Sign in again and retry.';
  }
  if (status === 413) {
    return 'The recipient list is too large for one request. Please retry — numbers are uploaded in batches.';
  }
  if (status === 0) {
    return 'The request was interrupted before it finished. Please wait a moment and try again.';
  }
  const raw = String(error?.userMessage || error?.message || '');
  if (
    raw &&
    !/password|token|secret|authorization|bearer/i.test(raw) &&
    raw.length < 220 &&
    !/^Failed to (create|process) campaign$/i.test(raw)
  ) {
    return raw;
  }
  return 'Failed to process campaign. Check the campaign name, approved Sender ID, message, and numbers, then try again.';
}

export async function saveRecipientChunks(campaignId, userId, recipients) {
  const jobs = [];
  for (let i = 0, idx = 0; i < recipients.length; i += RECIPIENT_CHUNK_SIZE, idx += 1) {
    jobs.push({ idx, phones: recipients.slice(i, i + RECIPIENT_CHUNK_SIZE) });
  }
  for (let i = 0; i < jobs.length; i += 4) {
    const batch = jobs.slice(i, i + 4);
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(
      batch.map((job) =>
        pb.collection('campaign_recipient_chunks').create(
          {
            campaign_id: campaignId,
            user_id: userId,
            chunk_index: job.idx,
            phones: job.phones,
          },
          { requestKey: `chunk-${campaignId}-${job.idx}`, $autoCancel: false },
        ),
      ),
    );
  }
}

export async function loadRecipientChunks(campaignId) {
  const chunks = await pb.collection('campaign_recipient_chunks').getFullList({
    filter: `campaign_id = "${campaignId}"`,
    sort: 'chunk_index',
    $autoCancel: false,
  });
  return chunks.flatMap((chunk) => (Array.isArray(chunk.phones) ? chunk.phones : []));
}
