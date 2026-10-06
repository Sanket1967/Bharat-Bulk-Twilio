// API-key management for the in-app UI (NOT the public v1 API).
//
//   POST /api-keys            { name? }        -> creates a key, returns plaintext ONCE
//   POST /api-keys/:id/regenerate              -> new plaintext, invalidates old key
//
// Auth: the user's PocketBase JWT (Bearer). The plaintext key is hashed
// (SHA-256) before it is stored; only the hash + a masked prefix persist.
// The plaintext is returned in the response exactly once and can never be
// recovered. Listing / toggling / deleting keys is done by the frontend
// directly against PocketBase (owner-scoped rules).
import crypto from 'node:crypto';
import logger from '../utils/logger.js';
import pocketbaseClient from '../utils/pocketbaseClient.js';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function generateApiKey() {
  // bb_live_<32 hex chars>
  return 'bb_live_' + crypto.randomBytes(24).toString('hex');
}

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
    return { id: payload.id, token };
  } catch (_) {
    return null;
  }
}

// POST /api-keys
export async function createApiKey(req, res) {
  const caller = decodeCaller(req);
  if (!caller?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { name } = req.body || {};
  const label = String(name || '').trim().slice(0, 80);

  const plaintext = generateApiKey();
  const hash = sha256(plaintext);
  const prefix = plaintext.slice(0, 14) + '...';

  try {
    const rec = await pocketbaseClient.collection('api_keys').create(
      {
        user_id: caller.id,
        name: label || 'Default',
        api_key: hash,
        key_prefix: prefix,
        is_active: true,
      },
      { $autoCancel: false },
    );
    return res.json({
      id: rec.id,
      name: rec.name,
      key_prefix: rec.key_prefix,
      is_active: rec.is_active,
      // Plaintext — shown once, never stored, never recoverable.
      api_key: plaintext,
      created: rec.created,
    });
  } catch (e) {
    logger.error('createApiKey failed:', String(e));
    return res.status(500).json({ error: 'Failed to create API key' });
  }
}

// POST /api-keys/:id/regenerate
export async function regenerateApiKey(req, res) {
  const caller = decodeCaller(req);
  if (!caller?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { id } = req.params;

  let existing;
  try {
    existing = await pocketbaseClient
      .collection('api_keys')
      .getOne(id, { $autoCancel: false });
  } catch (_) {
    return res.status(404).json({ error: 'API key not found' });
  }
  if (existing.user_id !== caller.id) {
    return res.status(404).json({ error: 'API key not found' });
  }

  const plaintext = generateApiKey();
  const hash = sha256(plaintext);
  const prefix = plaintext.slice(0, 14) + '...';

  try {
    const updated = await pocketbaseClient.collection('api_keys').update(
      id,
      {
        api_key: hash,
        key_prefix: prefix,
        is_active: true,
      },
      { $autoCancel: false },
    );
    return res.json({
      id: updated.id,
      name: updated.name,
      key_prefix: updated.key_prefix,
      is_active: updated.is_active,
      api_key: plaintext,
    });
  } catch (e) {
    logger.error('regenerateApiKey failed:', String(e));
    return res.status(500).json({ error: 'Failed to regenerate API key' });
  }
}
