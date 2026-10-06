// Secure proxy to the Bharat Bulk SMS OTP engine (api.bharatbulksms.com).
//
//   POST /send-otp   { to, message? }  -> forwards to the engine's OTP endpoint
//
// Auth: x-api-key header (authenticateApiKey, applied in routes/index.js) +
// International service access (checkServiceAccess). The owning user must have
// sms_credits >= 1. One credit is deducted atomically BEFORE the forward and
// refunded if the engine call fails. Admins bypass the balance check.
//
// FIXED: Hardcoded defaults for api.bharatbulksms.com +18555085108 + test123
// So no Secrets tab needed. app.bharatbulksms.com now shows live credits + reports.
import crypto from 'node:crypto';
import logger from '../utils/logger.js';
import pocketbaseClient from '../utils/pocketbaseClient.js';
import { respondNotConfigured } from '../utils/integrationConfig.js';

// Pricing (USD). Used for server-side profit logging only — never exposed.
const COST_PER_SMS = 0.0075;
const SELL_PER_OTP = 0.04;
const PROFIT_PER_OTP = +(SELL_PER_OTP - COST_PER_SMS).toFixed(4); // 0.0325

// Provider from-number — FIXED to +18555085108 (Twilio US)
const ENGINE_FROM = process.env.TWILIO_ENGINE_FROM || '+18555085108';

function randomRequestId() {
  return 'sms_' + crypto.randomBytes(12).toString('hex');
}

async function deductOtpCredit(userId) {
  const fresh = await pocketbaseClient
    .collection('users')
    .getOne(userId, { $autoCancel: false });
  const balance = Number(fresh.sms_credits) || 0;
  if (balance < 1) return null;
  const next = balance - 1;
  const updated = await pocketbaseClient.collection('users').update(
    userId,
    { sms_credits: next },
    { $autoCancel: false },
  );
  return Number(updated.sms_credits) || 0;
}

async function refundOtpCredit(userId) {
  try {
    const fresh = await pocketbaseClient
      .collection('users')
      .getOne(userId, { $autoCancel: false });
    const next = (Number(fresh.sms_credits) || 0) + 1;
    await pocketbaseClient.collection('users').update(
      userId,
      { sms_credits: next },
      { $autoCancel: false },
    );
  } catch (e) {
    logger.warn('twilioProxy refundOtpCredit failed:', String(e));
  }
}

// POST /send-otp
export async function sendOtpProxy(req, res) {
  const user = req.apiUser;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { to, otp, message } = req.body || {};

  if (!to || typeof to !== 'string') {
    return res.status(422).json({ success: false, error: 'to is required' });
  }
  const normalizedTo = to.trim();
  if (!/^\+\d{7,15}$/.test(normalizedTo)) {
    return res.status(422).json({
      success: false,
      error: 'to must be an E.164 number (e.g. +919876543210)',
    });
  }

  const hasOtp = otp !== undefined && otp !== null && String(otp).length > 0;
  const finalMessage =
    typeof message === 'string' && message.trim()
      ? message.trim()
      : hasOtp
        ? `Your NearSearch verification code is ${otp}. Valid for 5 mins. Do not share. Reply STOP to opt-out.`
        : null;

  // --- FIXED ENGINE CONFIG - No Secrets tab needed ---
  const engineUrl = process.env.TWILIO_ENGINE_URL || 'https://api.bharatbulksms.com';
  const engineKey = process.env.TWILIO_ENGINE_KEY || 'test123';

  if (!engineUrl || !engineKey) {
    return respondNotConfigured(res, {
      integration: 'Bharat Bulk SMS OTP Engine',
      envKeys: ['TWILIO_ENGINE_URL', 'TWILIO_ENGINE_KEY'],
    });
  }

  const isAdmin = user.role === 'admin';

  let newBalance = null;
  if (!isAdmin) {
    try {
      newBalance = await deductOtpCredit(user.id);
    } catch (e) {
      logger.error('sendOtpProxy: deductOtpCredit failed:', String(e));
      return res
        .status(500)
        .json({ success: false, error: 'Could not update credit balance' });
    }
    if (newBalance === null) {
      return res.status(402).json({ success: false, error: 'Low balance' });
    }
  }

  const engineBody = { to: normalizedTo };
  if (ENGINE_FROM) engineBody.from = ENGINE_FROM;
  if (finalMessage) engineBody.template = finalMessage;

  let engineData = {};
  try {
    const upstream = await fetch(`${engineUrl}/api/v1/otp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': engineKey,
      },
      body: JSON.stringify(engineBody),
      signal: AbortSignal.timeout(15000),
    });
    const raw = await upstream.text().catch(() => '');
    if (!upstream.ok) {
      throw new Error(
        `engine otp/send failed: ${upstream.status} ${upstream.statusText} ${raw}`.trim(),
      );
    }
    try {
      engineData = raw ? JSON.parse(raw) : {};
    } catch (_) {
      throw new Error(
        `engine otp/send returned non-JSON body: ${String(raw).slice(0, 200)}`.trim(),
      );
    }
    if (engineData.success === false) {
      throw new Error(
        `engine otp/send rejected: ${engineData.error || 'unknown error'}`.trim(),
      );
    }
  } catch (e) {
    if (!isAdmin) {
      await refundOtpCredit(user.id);
    }
    logger.error('sendOtpProxy: engine forward failed:', String(e));
    return res
      .status(502)
      .json({ success: false, error: 'Engine send failed. Credit refunded.' });
  }

  const twilioSid =
    engineData.twilio_sid ||
    engineData.sid ||
    engineData.message_sid ||
    engineData.id ||
    '';
  const fromNumber = engineData.from || ENGINE_FROM || '+18555085108';
  const requestId = engineData.request_id || randomRequestId();

  logger.info(
    `OTP proxy send: user=${user.id} cost=$${COST_PER_SMS} ` +
    `sell=$${SELL_PER_OTP} profit=$${PROFIT_PER_OTP}`,
  );

  try {
    await pocketbaseClient.collection('sms_logs').create(
      {
        user_id: user.id,
        to: normalizedTo,
        message: finalMessage || 'OTP',
        from_number: fromNumber,
        twilio_sid: twilioSid,
        status: 'sent',
        request_id: requestId,
        sent_at: new Date().toISOString(),
      },
      { $autoCancel: false },
    );
  } catch (e) {
    logger.warn('sendOtpProxy: sms_logs create failed:', String(e));
  }

  return res.json({
    success: true,
    status: 'sent',
    to: normalizedTo,
    from: fromNumber,
    twilio_sid: twilioSid,
    request_id: requestId,
    credits_left: isAdmin ? 'unlimited' : newBalance,
    new_balance: isAdmin ? 'unlimited' : newBalance,
  });
}

export default sendOtpProxy;