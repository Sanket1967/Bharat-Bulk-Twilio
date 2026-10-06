import { Router } from 'express';
import healthCheck from './health-check.js';
import {
  sendCampaign,
  smppStatus,
  smppConnect,
  smppDisconnect,
  updateUserPercentage,
  impersonateUser,
} from './sms.js';
import {
  createSubAccountRoute,
  addCreditsRoute,
  sendSmsRoute,
  listNumbersRoute,
  reportsRoute,
  twilioStatusWebhook,
  listSubAccountsRoute,
  associateSubAccountRoute,
} from './twilio.js';
import { createApiKey, regenerateApiKey } from './apiKeys.js';
import { dashboardReport } from './dashboardReport.js';
import apiV1Router from './apiV1.js';
import { sendOtpProxy } from './twilioProxy.js';
import { authenticateApiKey } from '../middleware/authenticateApiKey.js';
import { checkServiceAccess } from '../middleware/checkServiceAccess.js';

const router = Router();

export default () => {
  router.get('/health', healthCheck);

  // Dashboard live report (JWT auth) — credits_left + owner-scoped sms_logs,
  // shaped for the dashboard table. Returns 402 on low balance.
  router.get('/dashboard/report', dashboardReport);

  // SMS / SMPP — domestic SIM Base route requires can_use_domestic.
  router.post('/sms/send-campaign', checkServiceAccess('domestic'), sendCampaign);
  router.get('/sms/smpp-status', smppStatus);
  router.post('/sms/smpp-connect', smppConnect);
  router.post('/sms/smpp-disconnect', smppDisconnect);
  router.post('/admin/users/:id/percentage', updateUserPercentage);
  router.post('/admin/users/:id/impersonate', impersonateUser);

  // Twilio reseller
  router.post('/twilio/create-subaccount', createSubAccountRoute);
  router.get('/twilio/subaccounts', listSubAccountsRoute);
  router.post('/twilio/associate-subaccount', associateSubAccountRoute);
  router.post('/twilio/add-credits', addCreditsRoute);
  router.post('/twilio/send-sms', sendSmsRoute);
  router.get('/twilio/numbers', listNumbersRoute);
  router.get('/twilio/reports', reportsRoute);
  // Public webhook — Twilio posts delivery status callbacks here.
  router.post('/webhook/twilio-status', twilioStatusWebhook);
  // Alternate public webhook path (form-urlencoded). Same handler as above —
  // Twilio posts MessageSid + MessageStatus; we update the matching sms_logs
  // row by twilio_sid and return 200 OK. express.urlencoded is mounted
  // globally in main.js so the form payload is already parsed on req.body.
  router.post('/api/webhook/twilio_status.php', twilioStatusWebhook);

  // API-key management (in-app UI; JWT auth)
  router.post('/api-keys', createApiKey);
  router.post('/api-keys/:id/regenerate', regenerateApiKey);

  // Secure OTP proxy to the Bharat Bulk SMS engine (api.bharatbulksms.com).
  // API-key auth + International service access; charges one sms_credit
  // atomically (refunded on engine failure; admins bypass the balance check).
  //
  // Registered under BOTH paths so the endpoint is reachable:
  //   - /send-otp        via the in-app /hcgi/api browser prefix
  //   - /api/send-otp     on the Express app directly (public /api namespace,
  //                       consistent with the /api/v1 router below). Reachable
  //                       from the live domain only once Hostinger proxies
  //                       /api/* to this Express app — see deployment notes.
  router.post('/send-otp', authenticateApiKey, checkServiceAccess('international'), sendOtpProxy);
  router.post('/api/send-otp', authenticateApiKey, checkServiceAccess('international'), sendOtpProxy);

  // Public REST API v1 (x-api-key auth)
  router.use('/api/v1', apiV1Router);

  return router;
};
