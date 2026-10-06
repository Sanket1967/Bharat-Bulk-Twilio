// API-key authentication middleware for the public REST API (v1).
//
// Reads the `x-api-key` header, hashes it (SHA-256) and looks up the matching
// api_keys record via the server-side superuser client. The plaintext key is
// never stored, so lookup is always by hash. On success, attaches the owning
// user record to `req.apiUser` and the api_keys record to `req.apiKey`.
import crypto from 'node:crypto';
import logger from '../utils/logger.js';
import pocketbaseClient from '../utils/pocketbaseClient.js';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function authenticateApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || typeof key !== 'string') {
    return res.status(401).json({ success: false, error: 'Missing x-api-key header' });
  }

  const hash = sha256(key);

  let apiKeyRec;
  try {
    const rows = await pocketbaseClient.collection('api_keys').getFullList({
      filter: `api_key = "${hash}"`,
      $autoCancel: false,
    });
    apiKeyRec = rows[0];
  } catch (e) {
    logger.error('authenticateApiKey: lookup failed:', String(e));
    return res.status(500).json({ success: false, error: 'Authentication lookup failed' });
  }

  if (!apiKeyRec) {
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }
  if (apiKeyRec.is_active === false) {
    return res.status(401).json({ success: false, error: 'API key is disabled' });
  }

  let user;
  try {
    user = await pocketbaseClient
      .collection('users')
      .getOne(apiKeyRec.user_id, { $autoCancel: false });
  } catch (e) {
    logger.error('authenticateApiKey: user load failed:', String(e));
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }

  if (user.is_active === false || user.account_enabled === false) {
    return res.status(403).json({ success: false, error: 'Account is disabled' });
  }

  req.apiUser = user;
  req.apiKey = apiKeyRec;

  // Best-effort: stamp last_used. Never block the request on this.
  pocketbaseClient
    .collection('api_keys')
    .update(apiKeyRec.id, { last_used: new Date().toISOString() }, { $autoCancel: false })
    .catch(() => {});

  next();
}

export default authenticateApiKey;
