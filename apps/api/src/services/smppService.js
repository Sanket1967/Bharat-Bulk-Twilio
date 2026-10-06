// SMPP transceiver service.
//
// Reads credentials from ENV (SMPP_HOST/PORT/SYSTEM_ID/PASSWORD/SOURCE_ADDR)
// and falls back to the admin-managed `smpp_settings` PocketBase collection
// when the ENV vars are not set. Passwords are never logged or returned.
import smpp from 'smpp';
import logger from '../utils/logger.js';
import pocketbaseClient from '../utils/pocketbaseClient.js';

// DISCONNECTED | BINDING | CONNECTED
let state = 'DISCONNECTED';
let session = null;
let config = null;
let connectedAt = null;

const envConfig = () => ({
  host: process.env.SMPP_HOST || '',
  port: parseInt(process.env.SMPP_PORT || '2775', 10),
  systemId: process.env.SMPP_SYSTEM_ID || '',
  password: process.env.SMPP_PASSWORD || '',
  sourceAddr: process.env.SMPP_SOURCE_ADDR || 'GOOADV',
  systemType: process.env.SMPP_SYSTEM_TYPE || '',
  tps: parseInt(process.env.SMPP_TPS || '50', 10),
});

async function loadConfig() {
  const env = envConfig();
  if (env.host && env.systemId && env.password) {
    return { ...env, fromEnv: true };
  }
  // Fall back to the admin-managed PocketBase smpp_settings record.
  try {
    const recs = await pocketbaseClient
      .collection('smpp_settings')
      .getFullList({ $autoCancel: false });
    const s = recs && recs[0];
    if (s && s.serverHost && s.systemId && s.password) {
      return {
        host: s.serverHost,
        port: s.serverPort || 2775,
        systemId: s.systemId,
        password: s.password,
        sourceAddr: s.sourceAddress || 'GOOADV',
        systemType: s.systemType || '',
        tps: env.tps,
        fromEnv: false,
        recordId: s.id,
      };
    }
  } catch (e) {
    logger.warn('SMPP: failed to load settings from PocketBase:', String(e));
  }
  return null;
}

// Best-effort status write-back to the smpp_settings record (no password).
async function updateSettingsStatus(status, error) {
  if (!config || config.fromEnv || !config.recordId) return;
  try {
    await pocketbaseClient.collection('smpp_settings').update(
      config.recordId,
      {
        lastConnectionStatus: status,
        lastConnectionError: error || '',
        lastConnectionTime: new Date().toISOString(),
      },
      { $autoCancel: false },
    );
  } catch (_) {}
}

// Map an inbound DLR (deliver_sm) to a campaign_reports status.
function mapDlrStatus(messageState, statText) {
  const s = String(statText || '').toUpperCase();
  if (s === 'DELIVRD' || messageState === 2) return 'DELIVERED';
  if (s === 'EXPIRED' || messageState === 3) return 'FAILED';
  if (s === 'DELETED' || messageState === 4) return 'FAILED';
  if (s === 'UNDELIV' || messageState === 5) return 'FAILED';
  if (s === 'ACCEPTD' || messageState === 6) return 'SENT';
  if (s === 'UNKNOWN' || messageState === 7) return 'FAILED';
  if (s === 'REJECTED' || messageState === 8) return 'FAILED';
  if (s.includes('DND')) return 'DND';
  if (s.includes('INVALID')) return 'INVALID';
  return 'DELIVERED';
}

// Update a campaign_reports row + the campaign recipients JSON for a DLR.
async function applyDlr(messageId, status) {
  if (!messageId) return;
  try {
    const rows = await pocketbaseClient
      .collection('campaign_reports')
      .getFullList({
        filter: `operator_message_id = "${messageId}"`,
        $autoCancel: false,
      });
    if (!rows.length) return;
    const row = rows[0];
    await pocketbaseClient.collection('campaign_reports').update(
      row.id,
      { status, dlr_status: status, updated_at: new Date().toISOString() },
      { $autoCancel: false },
    );
    // Reflect the DLR on the campaign recipients JSON (best-effort).
    const campaignId = row.campaign_id;
    const campaign = await pocketbaseClient
      .collection('campaigns')
      .getOne(campaignId, { $autoCancel: false });
    const recipients = Array.isArray(campaign.recipients) ? campaign.recipients : [];
    if (!recipients.length) return;
    const phone = row.phone_number;
    const updated = recipients.map((r) =>
      r && r.p === phone ? { ...r, s: status } : r,
    );
    await pocketbaseClient.collection('campaigns').update(
      campaignId,
      { recipients: updated },
      { $autoCancel: false },
    );
  } catch (e) {
    logger.error('SMPP: DLR apply failed:', String(e));
  }
}

function handleDlr(pdu) {
  try {
    const messageId = pdu.receipted_message_id || '';
    const messageState = pdu.message_state;
    let stat = '';
    if (pdu.short_message) {
      const sm =
        typeof pdu.short_message === 'string'
          ? pdu.short_message
          : Buffer.from(pdu.short_message).toString('utf8');
      const m = sm.match(/stat:(\w+)/i);
      if (m) stat = m[1];
    }
    const status = mapDlrStatus(messageState, stat);
    logger.info(`SMPP DLR received: id=${messageId} stat=${stat} state=${messageState} -> ${status}`);
    applyDlr(messageId, status);
  } catch (e) {
    logger.error('SMPP: DLR handling error:', String(e));
  }
}

export async function connectSmpp() {
  config = await loadConfig();
  if (!config) {
    logger.warn('SMPP: credentials not configured — skipping connect');
    state = 'DISCONNECTED';
    return { connected: false, state, reason: 'not_configured' };
  }

  // Tear down any existing session before rebinding.
  if (session) {
    try { session.close(); } catch (_) {}
    session = null;
  }

  state = 'BINDING';
  const url = `smpp://${config.host}:${config.port}`;
  logger.info(`SMPP: connecting to ${config.host}:${config.port} (system_id=${config.systemId})`);

  try {
    session = smpp.connect({
      url,
      auto_enquire_link: true,
      enquire_link_interval: 30000,
      auto_reconnect: true,
    });
  } catch (e) {
    logger.error('SMPP: connect threw:', String(e));
    state = 'DISCONNECTED';
    return { connected: false, state, reason: 'connect_error' };
  }

  session.on('connect', () => {
    logger.info('SMPP: socket connected, binding transceiver');
    state = 'BINDING';
    session.bind_transceiver(
      {
        system_id: config.systemId,
        password: config.password,
        system_type: config.systemType,
      },
      (pdu) => {
        if (pdu.command_status === 0) {
          state = 'CONNECTED';
          connectedAt = Date.now();
          logger.info('SMPP: bound transceiver — ready to send');
          updateSettingsStatus('Connected', '');
        } else {
          state = 'DISCONNECTED';
          logger.error('SMPP: bind failed command_status=', pdu.command_status);
          updateSettingsStatus('Error', `Bind failed (status ${pdu.command_status})`);
        }
      },
    );
  });

  session.on('pdu', (pdu) => {
    // PDU-level errors (non-zero command_status on submits, etc.)
    if (pdu.command_status && pdu.command_status !== 0) {
      logger.warn(`SMPP pdu error: command=${pdu.command} status=${pdu.command_status}`);
    }
    if (pdu.command === 'deliver_sm') {
      handleDlr(pdu);
    }
  });

  session.on('close', () => {
    logger.warn('SMPP: session closed');
    state = 'DISCONNECTED';
    connectedAt = null;
    updateSettingsStatus('Disconnected', 'Connection closed');
  });

  session.on('error', (err) => {
    logger.error('SMPP: session error:', String(err));
    state = 'DISCONNECTED';
    updateSettingsStatus('Error', String(err));
  });

  return { connected: true, state };
}

// Submit a short message with registered_delivery=1 so the SMSC sends a DLR.
// dlrCallback(err, { messageId }) fires on the submit_sm response.
export function sendSms(destination, message, dlrCallback) {
  if (!session || state !== 'CONNECTED') {
    const err = new Error('SMPP not connected');
    if (dlrCallback) dlrCallback(err);
    return;
  }
  try {
    session.submit_sm(
      {
        source_addr: config.sourceAddr,
        destination_addr: String(destination),
        short_message: message,
        registered_delivery: 1, // 1 = SMSC delivery receipt requested
        dest_addr_ton: 1,
        dest_addr_npi: 1,
        source_addr_ton: 5,
        source_addr_npi: 0,
      },
      (pdu) => {
        if (pdu.command_status === 0) {
          if (dlrCallback) dlrCallback(null, { messageId: pdu.message_id });
        } else {
          if (dlrCallback)
            dlrCallback(new Error(`submit_sm failed: status ${pdu.command_status}`));
        }
      },
    );
  } catch (e) {
    if (dlrCallback) dlrCallback(new Error(`submit_sm threw: ${String(e)}`));
  }
}

export function getStatus() {
  return {
    state,
    connected: state === 'CONNECTED',
    uptimeSeconds: connectedAt ? Math.floor((Date.now() - connectedAt) / 1000) : 0,
    configured: !!(config && config.host),
    tps: config ? config.tps : parseInt(process.env.SMPP_TPS || '50', 10),
  };
}

export function disconnectSmpp() {
  if (session) {
    try { session.close(); } catch (_) {}
    session = null;
  }
  state = 'DISCONNECTED';
  connectedAt = null;
  return { connected: false, state };
}
