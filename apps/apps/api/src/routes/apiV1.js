// Public REST API v1 — SMS & OTP endpoints for integrators.
//
//   POST /api/v1/sms/send     { to, from, message }
//   POST /api/v1/otp/send     { to, from?, template? }
//   POST /api/v1/otp/verify   { request_id, otp }
//
// Auth: x-api-key header (authenticateApiKey middleware). The owning user must
// have a provisioned Twilio sub-account and sms_credits > 0. The 10 AM–6 PM
// IST sending window applies to API-triggered sends too. Credits are deducted
// by GSM/Unicode segment count and never allowed below zero.
import crypto from 'node:crypto';
import { Router } from 'express';
import logger from '../utils/logger.js';
import pocketbaseClient from '../utils/pocketbaseClient.js';
import { authenticateApiKey } from '../middleware/authenticateApiKey.js';
import { checkServiceAccess } from '../middleware/checkServiceAccess.js';
import { calculateSegments } from '../utils/calculateSegments.js';
import {
  isTwilioConfigured,
  sendSms,
  mapTwilioStatus,
} from '../services/twilioService.js';
import { respondNotConfigured } from '../utils/integrationConfig.js';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function randomRequestId() {
  return 'otp_' + crypto.randomBytes(16).toString('hex');
}

function randomSmsRequestId() {
  return 'sms_' + crypto.randomBytes(12).toString('hex');
}

// Best-effort ISO string from a Twilio date value (Date | string | null).
function toIsoDate(twilioDate) {
  if (!twilioDate) return null;
  try {
    const d = twilioDate instanceof Date ? twilioDate : new Date(twilioDate);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  } catch (_) {
    return null;
  }
}

function generateOtp() {
  // 6-digit zero-padded code.
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

// Deduct `segments` credits from the user atomically (read-modify-write via
// superuser). Returns the new balance, or null if insufficient credits.
async function deductCredits(userId, segments) {
  const fresh = await pocketbaseClient
    .collection('users')
    .getOne(userId, { $autoCancel: false });
  const balance = Number(fresh.sms_credits) || 0;
  if (balance < segments) return null;
  const next = balance - segments;
  const updated = await pocketbaseClient.collection('users').update(
    userId,
    { sms_credits: next },
    { $autoCancel: false },
  );
  return Number(updated.sms_credits) || 0;
}

async function refundCredits(userId, segments) {
  try {
    const fresh = await pocketbaseClient
      .collection('users')
      .getOne(userId, { $autoCancel: false });
    const next = (Number(fresh.sms_credits) || 0) + segments;
    await pocketbaseClient.collection('users').update(
      userId,
      { sms_credits: next },
      { $autoCancel: false },
    );
  } catch (e) {
    logger.warn('refundCredits failed:', String(e));
  }
}

// POST /api/v1/sms/send
export async function sendSmsV1(req, res) {
  const user = req.apiUser;
  const { to, from, message } = req.body || {};

  if (!to || !message) {
    return res
      .status(422)
      .json({ success: false, error: 'to and message are required' });
  }
  const fromNumber = (from || '').trim();
  if (!fromNumber) {
    return res
      .status(422)
      .json({ success: false, error: 'from is required' });
  }

  if (!isTwilioConfigured()) {
    return respondNotConfigured(res, {
      integration: 'Twilio',
      envKeys: ['TWILIO_MASTER_SID', 'TWILIO_MASTER_TOKEN'],
    });
  }

  // NOTE: The 10 AM – 6 PM IST sending window does NOT apply to the Twilio /
  // international SMS path — only to the SIM Base route.

  if (!user.sub_account_sid || !user.sub_account_auth_token) {
    return res.status(422).json({
      success: false,
      error: 'Your account does not have a Twilio sub-account yet.',
    });
  }

  // Admins get unlimited International SMS credits — verified from the
  // server-loaded user record (req.apiUser), never from a client flag. Admins
  // bypass the balance check and are never charged against sms_credits.
  const isAdmin = user.role === 'admin';

  const segments = calculateSegments(message);
  const credits = Number(user.sms_credits) || 0;
  if (!isAdmin && credits < segments) {
    return res.status(402).json({
      success: false,
      error: 'Insufficient SMS credits for this message.',
      segments_required: segments,
      credits_available: credits,
    });
  }

  // Deduct before send (fail-closed; refund on failure). Admins skip the
  // deduction entirely.
  let newBalance = null;
  if (!isAdmin) {
    try {
      newBalance = await deductCredits(user.id, segments);
    } catch (e) {
      logger.error('v1 sendSms: deductCredits failed:', String(e));
      return res.status(500).json({ success: false, error: 'Could not update credit balance' });
    }
    if (newBalance === null) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient SMS credits for this message.',
        segments_required: segments,
      });
    }
  }

  let twilioResult;
  try {
    twilioResult = await sendSms(
      user.sub_account_sid,
      user.sub_account_auth_token,
      to,
      fromNumber,
      message,
    );
  } catch (e) {
    if (!isAdmin) {
      await refundCredits(user.id, segments);
    }
    logger.error('v1 sendSms: twilio failed:', String(e));
    return res.status(502).json({ success: false, error: 'Twilio send failed. Credit refunded.' });
  }

  // Public handle the caller can use to look up this delivery report later.
  const requestId = randomSmsRequestId();

  // Log to sms_logs (owner-scoped; superuser write bypasses rules). Stamp the
  // exact API-call time so the Reports UI and /api/v1/reports can show
  // precise sent / delivered timing.
  try {
    await pocketbaseClient.collection('sms_logs').create(
      {
        user_id: user.id,
        to,
        message,
        from_number: fromNumber,
        twilio_sid: twilioResult.sid,
        status: mapTwilioStatus(twilioResult.status),
        request_id: requestId,
        sent_at: new Date().toISOString(),
        twilio_date_sent: toIsoDate(twilioResult.dateSent),
      },
      { $autoCancel: false },
    );
  } catch (e) {
    logger.warn('v1 sendSms: sms_logs create failed:', String(e));
  }

  return res.json({
    success: true,
    request_id: requestId,
    twilio_sid: twilioResult.sid,
    status: mapTwilioStatus(twilioResult.status),
    segments,
    credits_left: isAdmin ? 'unlimited' : newBalance,
    credits_unlimited: isAdmin,
  });
}

// POST /api/v1/otp/send
export async function sendOtpV1(req, res) {
  const user = req.apiUser;
  const { to, from, template } = req.body || {};

  if (!to) {
    return res.status(422).json({ success: false, error: 'to is required' });
  }
  const fromNumber = (from || '').trim();

  if (!isTwilioConfigured()) {
    return respondNotConfigured(res, {
      integration: 'Twilio',
      envKeys: ['TWILIO_MASTER_SID', 'TWILIO_MASTER_TOKEN'],
    });
  }

  // NOTE: The 10 AM – 6 PM IST sending window does NOT apply to the Twilio /
  // international SMS path — only to the SIM Base route.

  if (!user.sub_account_sid || !user.sub_account_auth_token) {
    return res.status(422).json({
      success: false,
      error: 'Your account does not have a Twilio sub-account yet.',
    });
  }

  // Admins get unlimited International SMS credits — verified from the
  // server-loaded user record (req.apiUser), never from a client flag.
  const isAdmin = user.role === 'admin';

  // An OTP SMS is short and GSM, so 1 segment. Calculate anyway for safety.
  const otp = generateOtp();
  const body = template
    ? String(template).replace(/\{\{otp\}\}/gi, otp)
    : `Your OTP is ${otp}`;
  const segments = calculateSegments(body);

  const credits = Number(user.sms_credits) || 0;
  if (!isAdmin && credits < segments) {
    return res.status(402).json({
      success: false,
      error: 'Insufficient SMS credits to send OTP.',
      credits_available: credits,
    });
  }

  // Persist the OTP record (hashed) BEFORE sending so we can verify later.
  const requestId = randomRequestId();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  try {
    await pocketbaseClient.collection('otps').create(
      {
        request_id: requestId,
        user_id: user.id,
        to,
        otp_hash: sha256(otp),
        expires_at: expiresAt,
        verified: false,
        attempts: 0,
      },
      { $autoCancel: false },
    );
  } catch (e) {
    logger.error('v1 sendOtp: otps create failed:', String(e));
    return res.status(500).json({ success: false, error: 'Could not create OTP record' });
  }

  // Deduct credits, then send. Refund on failure. Admins skip the deduction.
  let newBalance = null;
  if (!isAdmin) {
    try {
      newBalance = await deductCredits(user.id, segments);
    } catch (e) {
      logger.error('v1 sendOtp: deductCredits failed:', String(e));
      return res.status(500).json({ success: false, error: 'Could not update credit balance' });
    }
    if (newBalance === null) {
      // Best-effort: mark the OTP record so it can't be verified.
      return res.status(402).json({
        success: false,
        error: 'Insufficient SMS credits to send OTP.',
      });
    }
  }

  const sendFrom = fromNumber || process.env.TWILIO_DEFAULT_FROM || '';
  if (!sendFrom) {
    if (!isAdmin) {
      await refundCredits(user.id, segments);
    }
    return res.status(422).json({
      success: false,
      error: 'A from number is required. Provision a number on your Twilio sub-account first.',
    });
  }

  try {
    const twilioResult = await sendSms(
      user.sub_account_sid,
      user.sub_account_auth_token,
      to,
      sendFrom,
      body,
    );
    // Log to sms_logs. The OTP request_id is reused as the sms_logs
    // request_id so the caller can look up delivery timing for the OTP too.
    try {
      await pocketbaseClient.collection('sms_logs').create(
        {
          user_id: user.id,
          to,
          message: body,
          from_number: sendFrom,
          twilio_sid: twilioResult.sid,
          status: mapTwilioStatus(twilioResult.status),
          request_id: requestId,
          sent_at: new Date().toISOString(),
          twilio_date_sent: toIsoDate(twilioResult.dateSent),
        },
        { $autoCancel: false },
      );
    } catch (e) {
      logger.warn('v1 sendOtp: sms_logs create failed:', String(e));
    }

    return res.json({
      request_id: requestId,
      to,
      status: 'sent',
      twilio_sid: twilioResult.sid,
      credits_left: isAdmin ? 'unlimited' : newBalance,
      credits_unlimited: isAdmin,
    });
  } catch (e) {
    if (!isAdmin) {
      await refundCredits(user.id, segments);
    }
    logger.error('v1 sendOtp: twilio failed:', String(e));
    return res.status(502).json({ success: false, error: 'Twilio send failed. Credit refunded.' });
  }
}

// POST /api/v1/otp/verify
export async function verifyOtpV1(req, res) {
  const user = req.apiUser;
  const { request_id, otp } = req.body || {};

  if (!request_id || !otp) {
    return res.status(422).json({ success: false, error: 'request_id and otp are required' });
  }

  let record;
  try {
    const rows = await pocketbaseClient.collection('otps').getFullList({
      filter: `request_id = "${request_id}"`,
      $autoCancel: false,
    });
    record = rows[0];
  } catch (e) {
    logger.error('v1 verifyOtp: lookup failed:', String(e));
    return res.status(500).json({ success: false, error: 'Lookup failed' });
  }

  if (!record) {
    return res.status(404).json({ success: false, verified: false, error: 'OTP request not found' });
  }

  // Ownership: the OTP must belong to the API key's user.
  if (record.user_id !== user.id) {
    return res.status(404).json({ success: false, verified: false, error: 'OTP request not found' });
  }

  if (record.verified) {
    return res.json({ success: true, verified: true });
  }

  // Expiry check.
  const expiresAt = new Date(record.expires_at).getTime();
  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
    return res.json({ success: true, verified: false, error: 'OTP expired' });
  }

  // Attempt counter (rate-limit brute force).
  const attempts = (Number(record.attempts) || 0) + 1;
  if (attempts > 5) {
    try {
      await pocketbaseClient.collection('otps').update(record.id, { attempts }, { $autoCancel: false });
    } catch (_) { /* best-effort */ }
    return res.status(429).json({ success: false, verified: false, error: 'Too many attempts' });
  }

  const matches = sha256(String(otp)) === record.otp_hash;
  try {
    if (matches) {
      await pocketbaseClient.collection('otps').update(
        record.id,
        { verified: true, attempts },
        { $autoCancel: false },
      );
      return res.json({ success: true, verified: true });
    }
    await pocketbaseClient.collection('otps').update(record.id, { attempts }, { $autoCancel: false });
    return res.json({ success: true, verified: false, error: 'Invalid OTP' });
  } catch (e) {
    logger.error('v1 verifyOtp: update failed:', String(e));
    return res.status(500).json({ success: false, error: 'Verification failed' });
  }
}

// GET /api/v1/reports/:request_id
// Returns the delivery report for a single API send. Lookup is by the
// request_id returned from /sms/send or /otp/send. Access is restricted to
// the owning API key/user: a foreign request_id returns 404 (not 403) so ids
// cannot be enumerated.
export async function getReportV1(req, res) {
  const user = req.apiUser;
  const { request_id } = req.params || {};
  if (!request_id) {
    return res.status(422).json({ success: false, error: 'request_id is required' });
  }

  let record;
  try {
    const rows = await pocketbaseClient.collection('sms_logs').getFullList({
      filter: `request_id = "${request_id}"`,
      $autoCancel: false,
    });
    record = rows[0];
  } catch (e) {
    logger.error('v1 getReport: lookup failed:', String(e));
    return res.status(500).json({ success: false, error: 'Lookup failed' });
  }

  if (!record) {
    return res.status(404).json({ success: false, error: 'Report not found' });
  }

  // Ownership: the report must belong to the API key's user.
  if (record.user_id !== user.id) {
    return res.status(404).json({ success: false, error: 'Report not found' });
  }

  return res.json({
    request_id: record.request_id,
    to: record.to,
    sent_at: record.sent_at || null,
    delivered_at: record.delivered_at || null,
    duration_seconds:
      record.delivery_duration_seconds != null
        ? Number(record.delivery_duration_seconds)
        : null,
    status: record.status,
  });
}

// GET /api/v1/health
// Public (no API key) connectivity probe. Returns a JSON body so integrators
// can verify the API base URL and proxy are reachable before authenticating.
export function healthV1(req, res) {
  res.json({ status: 'ok', time: Date.now() });
}

// Router wiring — mounts the endpoints under /api/v1. The SMS/OTP/report
// routes require an API key; /health is intentionally public.
const router = Router();

// Public health/connectivity probe (no auth) — lets clients confirm the API
// base URL and proxy are reachable before sending authenticated requests.
router.get('/health', healthV1);

// The v1 SMS/OTP endpoints are the International (Twilio) API, so they
// require can_use_international on the owning user.
router.post('/sms/send', authenticateApiKey, checkServiceAccess('international'), sendSmsV1);
router.post('/otp/send', authenticateApiKey, checkServiceAccess('international'), sendOtpV1);
router.post('/otp/verify', authenticateApiKey, checkServiceAccess('international'), verifyOtpV1);
router.get('/reports/:request_id', authenticateApiKey, checkServiceAccess('international'), getReportV1);

export default router;
