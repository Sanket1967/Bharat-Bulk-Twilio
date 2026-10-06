import { useState, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';
import {
  explainCampaignError,
  saveRecipientChunks,
  loadRecipientChunks,
} from '@/lib/campaignRecipients';

// A number is valid only if it has exactly 10 digits (after stripping
// non-digit characters). Invalid numbers are not charged any credits.
const digitsOf = (num) => String(num || '').replace(/\D/g, '');
const isValidPhone = (num) => digitsOf(num).length === 10;

// 160 characters per SMS part (including special characters). Each valid
// recipient is charged one credit per SMS part required for the message.
const smsPartsFor = (messageText) => {
  const len = (messageText || '').length;
  if (len <= 0) return 1;
  return Math.ceil(len / 160);
};

const parseNumbers = (raw) => {
  if (Array.isArray(raw)) return raw.map((n) => String(n).trim()).filter(Boolean);
  return String(raw || '')
    .split(/[\n,;]+/)
    .map((n) => n.trim())
    .filter(Boolean);
};

export const useCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCampaigns = useCallback(async (statusFilter = '') => {
    setLoading(true);
    try {
      let filter = '';
      if (statusFilter) {
        filter = `status = "${statusFilter}"`;
      }

      const result = await pb.collection('campaigns').getFullList({
        filter,
        sort: '-created',
        // Exclude the per-recipient JSON blob from list responses.
        fields: 'id,created,updated,name,description,message,scheduled_time,status,created_by,total_recipients,valid_count,invalid_count,sms_parts,credits_used,pending_count,sent_count,completed_count,failed_count',
        $autoCancel: false
      });
      setCampaigns(result);
    } catch (error) {
      toast.error('Failed to load campaigns');
      console.error('Fetch campaigns error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Bulk send: instead of creating one message + one delivery_log row per
  // recipient (which freezes the app at 10k–50k recipients), we compute the
  // aggregate counts client-side and store them on a SINGLE campaign record.
  // This makes sending 50k messages instant and the report instant too.
  const createCampaign = useCallback(async (campaignData) => {
    try {
      const userId = pb.authStore.model?.id || pb.authStore.record?.id;
      if (!userId) {
        const err = new Error('Your session expired. Sign in again, then retry the campaign.');
        err.userMessage = err.message;
        throw err;
      }
      const { recipientNumbers, dltTemplateId, senderId: _senderId, channel: _channel, route, ...rest } = campaignData;

      const numbers = parseNumbers(recipientNumbers);
      const messageText = rest.message || '';
      const smsParts = smsPartsFor(messageText);

      const validNumbers = numbers.filter(isValidPhone);
      const invalidNumbers = numbers.filter((n) => !isValidPhone(n));
      const creditsToDeduct = validNumbers.length * smsParts;

      let status = rest.status || 'draft';
      let isImmediateSend = status === 'sent';

      // Credit check: a user must not send more messages than their available
      // credits allow. Fetch the current balance and compare it against the
      // credits this campaign would consume (valid recipients × SMS parts).
      // Invalid numbers are never charged, so they're excluded from the check.
      let availableCredits = 0;
      try {
        const userRec = await pb.collection('users').getOne(userId, { $autoCancel: false });
        availableCredits = userRec.credits || 0;
      } catch (e) {
        console.error('Failed to load user credits', e);
      }

      // If an immediate send would exceed the available credits, hold the
      // campaign as a draft (on hold) instead of sending, and notify the user.
      // No credits are deducted for a held campaign.
      let heldForLowCredit = false;
      if (isImmediateSend && creditsToDeduct > availableCredits) {
        heldForLowCredit = true;
        status = 'draft';
        isImmediateSend = false;
        toast.error(
          `Insufficient credits! This campaign needs ${creditsToDeduct} credit(s) but you have ${availableCredits}. The campaign has been put on hold as a draft. Please add credits to send it.`,
        );
      } else if (isImmediateSend && creditsToDeduct > 0 && availableCredits - creditsToDeduct <= Math.max(10, creditsToDeduct * 0.1)) {
        // Low-credit warning: still sends, but warns the user their balance
        // will be low afterwards.
        toast.warning(
          `Low credit alert! After this campaign you will have ${availableCredits - creditsToDeduct} credit(s) remaining.`,
        );
      }

      // Aggregate delivery counts. For an immediate send, valid recipients
      // start as "pending" and progress over time (pending → sent → completed);
      // invalid numbers are recorded as "failed" immediately (no credits).
      const pendingCount = isImmediateSend ? validNumbers.length : 0;
      const failedCount = isImmediateSend ? invalidNumbers.length : 0;
      const creditsUsed = status === 'draft' ? 0 : creditsToDeduct;

      // Persist the per-recipient phone list (valid + invalid) on the campaign
      // record so reports can show exactly which numbers were targeted. Compact
      // keys keep the payload small even for 50k recipients. Invalid numbers are
      // marked v:false so the report can show them as failed/not charged.
      const recipients = numbers.map((phone) => ({
        p: phone,
        v: isValidPhone(phone),
      }));

      // Do not embed tens of thousands of numbers on the campaign row.
      // A single multi-megabyte JSON body is rejected by the proxy and
      // surfaces as a generic "Failed to process campaign" toast.
      const descriptionBits = [rest.description].filter(Boolean);
      if (dltTemplateId && !String(rest.description || '').includes(dltTemplateId)) {
        descriptionBits.push(`DLT: ${dltTemplateId}`);
      }
      const payload = {
        ...rest,
        description: descriptionBits.join(' | ') || rest.description || '',
        created_by: userId,
        status,
        total_recipients: numbers.length,
        valid_count: validNumbers.length,
        invalid_count: invalidNumbers.length,
        sms_parts: smsParts,
        credits_used: creditsUsed,
        pending_count: pendingCount,
        sent_count: 0,
        completed_count: 0,
        failed_count: failedCount,
      };
      if (!payload.scheduled_time) delete payload.scheduled_time;

      const newCampaign = await pb.collection('campaigns').create(payload, { $autoCancel: false });

      if (recipients.length) {
        try {
          await saveRecipientChunks(newCampaign.id, userId, recipients);
        } catch (chunkErr) {
          try {
            await pb.collection('campaigns').delete(newCampaign.id, { $autoCancel: false });
          } catch (_) { /* best-effort rollback */ }
          const err = new Error(
            'Recipient numbers could not be saved. No credits were charged. Please retry.',
          );
          err.userMessage = err.message;
          err.cause = chunkErr;
          throw err;
        }
      }

      // Deduct credits immediately for an immediate send. Scheduled/draft
      // campaigns are charged by the deduct-credits hook when they transition
      // to "sent". Held (insufficient-credit) campaigns are drafts, so no
      // deduction happens here.
      if (isImmediateSend && creditsToDeduct > 0) {
        try {
          await pb.collection('users').update(
            userId,
            { credits: availableCredits - creditsToDeduct },
            { $autoCancel: false },
          );
          await pb.collection('user_credits_log').create(
            {
              user_id: userId,
              action: 'spent',
              amount: creditsToDeduct,
              campaign_id: newCampaign.id,
            },
            { $autoCancel: false },
          );
        } catch (e) {
          console.error('Credit deduction failed', e);
        }
      }

      if (invalidNumbers.length > 0) {
        toast.message(`${invalidNumbers.length} invalid number(s) skipped — no credits charged`);
      }

      // Dispatch the actual SMPP sends through the Express queue. Fire-and-
      // forget: the campaign record + aggregate counts already exist, so a
      // queue/SMPP failure does not break the campaign. The queue applies the
      // user's delivery-percentage cap and writes per-recipient reports.
      let queueWarning = '';
      if (isImmediateSend && newCampaign?.id) {
        try {
          const queued = await apiServerClient.fetch('/sms/send-campaign', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: pb.authStore.token,
            },
            body: JSON.stringify({ campaignId: newCampaign.id, route }),
          });
          if (!queued.ok) {
            const body = await queued.json().catch(() => ({}));
            queueWarning = body.error || `Send queue rejected the campaign (${queued.status}).`;
            console.error('SMPP queue dispatch failed', queued.status, queueWarning);
          }
        } catch (e) {
          queueWarning = 'Campaign was saved, but the send queue could not be reached. Open the campaign to confirm delivery.';
          console.error('SMPP queue dispatch failed', e);
        }
      }

      if (!heldForLowCredit) {
        toast.success('Campaign created successfully');
      }
      if (queueWarning) {
        toast.warning(queueWarning);
      }
      return { ...newCampaign, heldForLowCredit, queueWarning };
    } catch (error) {
      console.error('Create campaign error:', error);
      const wrapped = error.userMessage ? error : new Error(explainCampaignError(error));
      if (!error.userMessage) wrapped.userMessage = wrapped.message;
      throw wrapped;
    }
  }, []);

  const updateCampaign = useCallback(async (id, campaignData) => {
    try {
      const updated = await pb.collection('campaigns').update(id, campaignData, { $autoCancel: false });
      toast.success('Campaign updated successfully');
      return updated;
    } catch (error) {
      toast.error('Failed to update campaign');
      console.error('Update campaign error:', error);
      throw error;
    }
  }, []);

  const deleteCampaign = useCallback(async (id) => {
    try {
      await pb.collection('campaigns').delete(id, { $autoCancel: false });
      toast.success('Campaign deleted successfully');
    } catch (error) {
      toast.error('Failed to delete campaign');
      console.error('Delete campaign error:', error);
      throw error;
    }
  }, []);

  const getCampaignDetails = useCallback(async (id) => {
    try {
      const campaign = await pb.collection('campaigns').getOne(id, { $autoCancel: false });

      // Recipient phone numbers live on the campaign record as a JSON array
      // (see createCampaign). For older campaigns sent before this field
      // existed, fall back to the messages collection so their reports still
      // show the targeted numbers.
      let recipients = Array.isArray(campaign.recipients) ? campaign.recipients : null;
      if (!recipients || recipients.length === 0) {
        try {
          recipients = await loadRecipientChunks(id);
        } catch (e) {
          console.error('Recipient chunk load failed', e);
          recipients = [];
        }
      }
      if (!recipients || recipients.length === 0) {
        try {
          const msgs = await pb.collection('messages').getFullList({
            filter: `campaign_id = "${id}"`,
            $autoCancel: false,
          });
          recipients = msgs.map((m) => ({
            p: m.phone,
            v: true,
            status: m.status,
          }));
        } catch (e) {
          console.error('Fallback messages load failed', e);
          recipients = [];
        }
      }

      return { campaign, recipients, messages: [] };
    } catch (error) {
      toast.error('Failed to load campaign details');
      console.error('Get campaign details error:', error);
      throw error;
    }
  }, []);

  return {
    campaigns,
    loading,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    getCampaignDetails
  };
};
