// Twilio reseller service.
//
// All Twilio API calls happen here (backend only). The master credentials
// (TWILIO_MASTER_SID / TWILIO_MASTER_TOKEN) provision sub-accounts for each
// client. Per-client sends use that client's own sub-account credentials so
// Twilio's real cost ($0.0075) is billed to the master balance while the
// client only ever sees their reseller credit balance (sms_credits).
//
// Master credentials are USER-SUPPLIED. If they are missing or invalid, every
// method throws — callers report a "not configured" state rather than 500ing.
import Twilio from 'twilio';
import logger from '../utils/logger.js';

const MASTER_SID = process.env.TWILIO_MASTER_SID;
const MASTER_TOKEN = process.env.TWILIO_MASTER_TOKEN;

export function isTwilioConfigured() {
  return (
    String(MASTER_SID ?? '').trim() !== '' &&
    String(MASTER_TOKEN ?? '').trim() !== ''
  );
}

function masterClient() {
  if (!isTwilioConfigured()) {
    throw new Error('Twilio master credentials are not configured');
  }
  return Twilio(MASTER_SID, MASTER_TOKEN);
}

// Create a Twilio sub-account under the master account. Returns the new
// sub-account SID + auth token so we can persist them on the user record.
export async function createSubAccount(friendlyName) {
  const client = masterClient();
  const account = await client.api.v2010.accounts.create({
    friendlyName: friendlyName || 'Bharat Bulk SMS Client',
  });
  return {
    sid: account.sid,
    authToken: account.authToken,
  };
}

// List existing sub-accounts under the master account. Returns only the
// non-sensitive fields (sid, friendlyName, status) — never the auth token.
// Used by the admin "International SMS user" flow to pick an already-existing
// sub-account to associate with a new user.
export async function listSubAccounts() {
  const client = masterClient();
  const accounts = await client.api.v2010.accounts.list({ limit: 100 });
  return accounts
    .filter((a) => a.sid !== MASTER_SID) // exclude the master account itself
    .map((a) => ({
      sid: a.sid,
      friendlyName: a.friendlyName || '',
      status: a.status, // 'active' | 'suspended' | 'closed'
    }));
}

// Fetch the auth token for an existing sub-account under the master account.
// The master account can read any sub-account's authToken via the API. We use
// this to securely persist the token on the user record when an admin
// associates an existing sub-account (instead of creating a new one).
export async function getSubAccountToken(subAccountSid) {
  const client = masterClient();
  const account = await client.api.v2010.accounts(subAccountSid).fetch();
  if (!account || !account.authToken) {
    throw new Error('Twilio sub-account not found or has no auth token');
  }
  return account.authToken;
}

// Build a Twilio client scoped to a user's sub-account.
export function subAccountClient(subAccountSid, subAccountToken) {
  if (!subAccountSid || !subAccountToken) {
    throw new Error('User Twilio sub-account is not provisioned');
  }
  return Twilio(subAccountSid, subAccountToken);
}

// Send a single SMS from the user's sub-account. Returns the message SID +
// initial status. Twilio bills the master balance; we never surface that cost.
export async function sendSms(subAccountSid, subAccountToken, to, from, body) {
  const client = subAccountClient(subAccountSid, subAccountToken);
  const message = await client.messages.create({
    to,
    from,
    body,
  });
  return {
    sid: message.sid,
    status: message.status,
    dateCreated: message.dateCreated,
    dateSent: message.dateSent,
    dateUpdated: message.dateUpdated,
  };
}

// List phone numbers provisioned on the user's sub-account (for the "from"
// number selector in the campaign UI).
export async function listNumbers(subAccountSid, subAccountToken) {
  const client = subAccountClient(subAccountSid, subAccountToken);
  const numbers = await client.incomingPhoneNumbers.list({ limit: 50 });
  return numbers.map((n) => ({
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName,
    capabilities: n.capabilities,
  }));
}

// Fetch the live status of a message from Twilio (for report syncing).
export async function fetchMessageStatus(subAccountSid, subAccountToken, messageSid) {
  const client = subAccountClient(subAccountSid, subAccountToken);
  const message = await client.messages(messageSid).fetch();
  return { sid: message.sid, status: message.status, errorCode: message.errorCode };
}

// Map a Twilio MessageStatus to our internal sms_logs status vocabulary.
export function mapTwilioStatus(twilioStatus) {
  const s = String(twilioStatus || '').toLowerCase();
  switch (s) {
    case 'queued':
    case 'accepted':
      return 'queued';
    case 'sending':
      return 'sent';
    case 'sent':
      return 'sent';
    case 'delivered':
      return 'delivered';
    case 'undelivered':
    case 'failed':
      return 'failed';
    case 'canceled':
      return 'failed';
    default:
      return s || 'unknown';
  }
}
