// SMS / SMPP API endpoints - FIXED to use api.bharatbulksms.com engine +18555085108
import logger from '../utils/logger.js';
import pocketbaseClient from '../utils/pocketbaseClient.js';
import { connectSmpp, getStatus, disconnectSmpp } from '../services/smppService.js';
import { loadStoredRecipients } from '../services/queue.js';

const ENGINE_URL = process.env.TWILIO_ENGINE_URL || 'https://api.bharatbulksms.com';
const ENGINE_KEY = process.env.TWILIO_ENGINE_KEY || 'test123';
const ENGINE_FROM = process.env.TWILIO_ENGINE_FROM || '+18555085108';

function decodeCaller(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return { id: payload.id, role: payload.role || '', token };
  } catch (_) { return null; }
}
async function resolveCaller(req) {
  const base = decodeCaller(req);
  if (!base?.id) return null;
  if (base.role === 'admin') return base;
  try {
    const user = await pocketbaseClient.collection('users').getOne(base.id, { $autoCancel: false });
    return { ...base, role: user.role || '' };
  } catch (_) { return base; }
}

export async function sendCampaign(req, res) {
  const caller = decodeCaller(req);
  if (!caller) return res.status(401).json({ error: 'Unauthorized' });
  const { campaignId } = req.body || {};
  if (!campaignId) return res.status(422).json({ error: 'campaignId is required' });

  let campaign;
  try {
    campaign = await pocketbaseClient.collection('campaigns').getOne(campaignId, { $autoCancel: false });
  } catch (e) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  if (campaign.created_by !== caller.id && caller.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const stored = await loadStoredRecipients(campaign);
  const numbers = stored.map((r) => r.p).filter(Boolean);
  const message = campaign.message || '';
  if (!numbers.length) return res.status(422).json({ error: 'This campaign has no recipient numbers to send.' });

  let user;
  try { user = await pocketbaseClient.collection('users').getOne(caller.id, { $autoCancel: false }); }
  catch (_) { return res.status(404).json({ error: 'User not found' }); }

  const isAdmin = user.role === 'admin';
  const credits = Number(user.sms_credits) || 0;
  if (!isAdmin && credits < numbers.length) {
    return res.status(402).json({ error: `Low balance: need ${numbers.length}, have ${credits}` });
  }

  let sent = 0, failed = 0;
  const results = [];

  for (const to of numbers) {
    try {
      const upstream = await fetch(`${ENGINE_URL}/api/v1/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ENGINE_KEY },
        body: JSON.stringify({ to, template: message, from: ENGINE_FROM }),
        signal: AbortSignal.timeout(15000),
      });
      const raw = await upstream.text().catch(() => '');
      const data = raw ? JSON.parse(raw) : {};
      if (!upstream.ok || data.success === false) throw new Error(raw || 'engine failed');

      await pocketbaseClient.collection('sms_logs').create({
        user_id: caller.id,
        to,
        message,
        from_number: data.from || ENGINE_FROM,
        twilio_sid: data.twilio_sid || data.sid || '',
        status: 'sent',
        sent_at: new Date().toISOString(),
      }, { $autoCancel: false });

      sent++;
      results.push({ to, status: 'sent' });
    } catch (e) {
      logger.warn(`sendCampaign failed for ${to}: ${String(e)}`);
      await pocketbaseClient.collection('sms_logs').create({
        user_id: caller.id,
        to,
        message,
        from_number: ENGINE_FROM,
        twilio_sid: '',
        status: 'failed',
        sent_at: new Date().toISOString(),
        failed_at: new Date().toISOString(),
      }, { $autoCancel: false }).catch(() => { });
      failed++;
      results.push({ to, status: 'failed', error: String(e).slice(0, 200) });
    }
  }

  if (!isAdmin && sent > 0) {
    try {
      const fresh = await pocketbaseClient.collection('users').getOne(caller.id, { $autoCancel: false });
      const next = Math.max(0, (Number(fresh.sms_credits) || 0) - sent);
      await pocketbaseClient.collection('users').update(caller.id, { sms_credits: next }, { $autoCancel: false });
    } catch (e) { logger.warn('credit deduction failed', String(e)); }
  }

  return res.json({ ok: true, sent, failed, total: numbers.length, results, queueLength: 0 });
}

export function smppStatus(req, res) { return res.json(getStatus()); }
export async function smppConnect(req, res) {
  const caller = decodeCaller(req);
  if (!caller || caller.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const result = await connectSmpp(); return res.json(result);
}
export async function smppDisconnect(req, res) {
  const caller = decodeCaller(req);
  if (!caller || caller.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  return res.json(disconnectSmpp());
}
export async function updateUserPercentage(req, res) {
  const caller = decodeCaller(req);
  if (!caller || caller.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { id } = req.params; const { deliveryPercentage } = req.body || {};
  const pct = parseInt(deliveryPercentage, 10);
  if (!Number.isFinite(pct) || pct < 1 || pct > 100) return res.status(422).json({ error: 'deliveryPercentage must be 1-100' });
  try {
    const updated = await pocketbaseClient.collection('users').update(id, { delivery_percentage: pct }, { $autoCancel: false });
    return res.json({ ok: true, delivery_percentage: updated.delivery_percentage });
  } catch (e) { return res.status(404).json({ error: 'User not found' }); }
}
export async function impersonateUser(req, res) {
  const caller = await resolveCaller(req);
  if (!caller || caller.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { id } = req.params; if (!id) return res.status(422).json({ error: 'User id required' });
  if (id === caller.id) return res.status(422).json({ error: 'Already logged in as this user' });
  try {
    let target; try { target = await pocketbaseClient.collection('users').getOne(id, { $autoCancel: false }); } catch (_) { return res.status(404).json({ error: 'User not found' }); }
    if (target.is_active === false || target.account_enabled === false) return res.status(403).json({ error: 'Cannot login as deactivated user' });
    const suToken = pocketbaseClient.authStore.token; const suModel = pocketbaseClient.authStore.model;
    let impersonatedClient;
    try { impersonatedClient = await pocketbaseClient.collection('users').impersonate(id, 3600); }
    finally { if (suToken) pocketbaseClient.authStore.save(suToken, suModel); }
    const token = impersonatedClient?.authStore?.token || null;
    const record = impersonatedClient?.authStore?.record || impersonatedClient?.authStore?.model || null;
    if (!token || !record) return res.status(500).json({ error: 'Failed to create user session' });
    const safeRecord = { ...target, ...record, id: record.id || target.id, email: record.email || target.email, name: record.name || target.name || '', role: record.role || target.role || 'user', credits: record.credits ?? target.credits ?? 0 };
    delete safeRecord.password; delete safeRecord.tokenKey; delete safeRecord.passwordHash;
    return res.json({ ok: true, token, record: safeRecord });
  } catch (e) { return res.status(500).json({ error: e?.message || 'Failed' }); }
}