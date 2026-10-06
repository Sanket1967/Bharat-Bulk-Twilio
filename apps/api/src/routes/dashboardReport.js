// Dashboard live report — backend-mediated equivalent of the external
// api.bharatbulksms.com/api/v1/report endpoint.
//
//   GET /dashboard/report  -> { credits_left, credits_unlimited, low_balance, logs }
//
// Auth: the caller's PocketBase JWT (Bearer), same pattern as /twilio/reports.
// The plaintext API key is NEVER used here (it is stored only as a one-way
// hash, so it cannot be recovered to call the external engine directly). We
// read the same owner-scoped data the external API would expose: the user's
// sms_credits balance and their sms_logs rows, reshaped to the requested
// fields (to_number, from_number, message, otp, time, status).
//
// HTTP 402 is returned when the (non-admin) user has no International SMS
// credits so the dashboard can surface a Low Balance modal. The logs are
// still included in the 402 body so the table stays useful.
import logger from '../utils/logger.js';
import pocketbaseClient from '../utils/pocketbaseClient.js';

// Decode the PocketBase JWT to identify the caller (same approach as twilio.js).
function decodeCaller(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8'),
    );
    return { id: payload.id, role: payload.role || '' };
  } catch (_) {
    return null;
  }
}

// Best-effort OTP extraction from the message body. OTP messages embed a
// 4–8 digit code (e.g. "Your OTP is 123456"). The OTP itself is stored only
// as a hash in the `otps` collection, so it cannot be recovered directly;
// extracting it from the logged message text is the available source.
function extractOtp(message) {
  if (!message) return null;
  const m = String(message).match(/\b(\d{4,8})\b/);
  return m ? m[1] : null;
}

// GET /dashboard/report
export async function dashboardReport(req, res) {
  const caller = decodeCaller(req);
  if (!caller?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let user;
  try {
    user = await pocketbaseClient
      .collection('users')
      .getOne(caller.id, { $autoCancel: false });
  } catch (_) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Admins get unlimited International SMS credits (server-side bypass), so
  // they never hit the low-balance state.
  const isAdmin = user.role === 'admin';
  const credits = Number(user.sms_credits) || 0;
  const lowBalance = !isAdmin && credits <= 0;

  let logs = [];
  try {
    const rows = await pocketbaseClient.collection('sms_logs').getFullList({
      filter: `user_id = "${caller.id}"`,
      sort: '-created',
      $autoCancel: false,
    });
    logs = rows.map((r) => ({
      id: r.id,
      to_number: r.to || '',
      from_number: r.from_number || '',
      message: r.message || '',
      otp: extractOtp(r.message),
      time: r.sent_at || r.created || null,
      status: r.status || 'queued',
    }));
  } catch (e) {
    logger.warn('dashboard/report: sms_logs load failed:', String(e));
  }

  // 402 signals a low balance so the UI can show a Low Balance modal. The
  // body still carries the logs + balance so the dashboard remains useful.
  return res.status(lowBalance ? 402 : 200).json({
    credits_left: credits,
    credits_unlimited: isAdmin,
    low_balance: lowBalance,
    logs,
  });
}
