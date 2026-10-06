import pb from '@/lib/pocketbaseClient';

const PENDING_TO_SENT_MS = 30 * 1000;
const SENT_TO_COMPLETED_MS = 120 * 1000;

/**
 * Advance sent campaigns' aggregate delivery counts by age:
 * pending → sent after 30s, sent → completed after 2m total from created.
 *
 * This operates on the campaign record's pending_count/sent_count/completed_count
 * counters (not per-recipient rows), so it scales to any recipient volume
 * (50k+) with a handful of updates instead of tens of thousands.
 */
export async function advanceDeliveryStatuses() {
  if (!pb.authStore.isValid) return { advanced: 0 };

  const now = Date.now();
  let advanced = 0;

  try {
    const sentCampaigns = await pb.collection('campaigns').getFullList({
      filter: 'status = "sent"',
      fields: 'id,created,valid_count,pending_count,sent_count,completed_count,status',
      $autoCancel: false,
    });

    for (let i = 0; i < sentCampaigns.length; i++) {
      const c = sentCampaigns[i];
      const valid = c.valid_count || 0;
      if (valid <= 0) continue;

      const createdMs = new Date(c.created).getTime();
      if (Number.isNaN(createdMs)) continue;
      const age = now - createdMs;

      let pendingCount;
      let sentCount;
      let completedCount;
      if (age >= SENT_TO_COMPLETED_MS) {
        pendingCount = 0;
        sentCount = 0;
        completedCount = valid;
      } else if (age >= PENDING_TO_SENT_MS) {
        pendingCount = 0;
        sentCount = valid;
        completedCount = 0;
      } else {
        pendingCount = valid;
        sentCount = 0;
        completedCount = 0;
      }

      // Only write when the counters actually changed.
      if (
        c.pending_count !== pendingCount ||
        c.sent_count !== sentCount ||
        c.completed_count !== completedCount
      ) {
        try {
          await pb.collection('campaigns').update(
            c.id,
            {
              pending_count: pendingCount,
              sent_count: sentCount,
              completed_count: completedCount,
            },
            { requestKey: `adv-campaign-${c.id}` },
          );
          advanced += 1;
        } catch (err) {
          console.error('advanceDeliveryStatuses campaign failed', c.id, err);
        }
      }
    }
  } catch (err) {
    console.error('advanceDeliveryStatuses failed', err);
  }

  return { advanced };
}
