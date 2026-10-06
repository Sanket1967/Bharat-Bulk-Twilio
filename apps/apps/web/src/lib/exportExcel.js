import * as XLSX from 'xlsx';

// Build a worksheet from an array of row objects and trigger a browser
// download as a real .xlsx file. `sheets` is an array of { name, rows } so a
// single workbook can contain multiple tabs (e.g. summary + recipients).
export const downloadExcel = (sheets, fileName = 'report.xlsx') => {
  const wb = XLSX.utils.book_new();

  sheets.forEach((sheet, idx) => {
    const safeName = (sheet.name || `Sheet${idx + 1}`).slice(0, 31);
    const ws = XLSX.utils.json_to_sheet(sheet.rows && sheet.rows.length ? sheet.rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });

  XLSX.writeFile(wb, fileName);
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const formatDateShort = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Format a timestamp as IST: "05 Oct 2025, 02:15:30 PM".
const formatIST = (date) => {
  if (!date) return '—';
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).formatToParts(new Date(date));
    const get = (t) => parts.find((p) => p.type === t)?.value || '';
    const dayPeriod = (parts.find((p) => p.type === 'dayPeriod')?.value || '').toUpperCase();
    return `${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')}:${get('second')} ${dayPeriod}`;
  } catch {
    return '—';
  }
};

// Human-readable delivery duration: "4s" or "1m 12s".
const formatDuration = (seconds) => {
  const s = Number(seconds);
  if (!Number.isFinite(s)) return '—';
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m ${rem}s`;
};

const senderFromDescription = (desc) => {
  if (!desc) return 'SHMGRH';
  const m = desc.match(/Sender:\s*([^,]+)/i);
  const val = m ? m[1].trim() : 'SHMGRH';
  return val === 'none' || val === 'None' ? '—' : val;
};

const channelFromDescription = (desc) => {
  if (!desc) return 'SMS';
  const m = desc.match(/Channel:\s*([^,]+)/i);
  return m ? m[1].trim() : 'SMS';
};

// Export the full recipient report for a single campaign (Campaign Details).
// Works for both current campaigns (recipients JSON on the record) and older
// ones (fallback to messages collection handled by the caller).
export const exportCampaignDetails = (campaign, recipients) => {
  const PENDING_TO_SENT_MS = 30 * 1000;
  const SENT_TO_COMPLETED_MS = 120 * 1000;

  const recipientStatus = (r) => {
    if (r && r.status) return r.status;
    if (!r || r.v === false) return 'failed';
    if (campaign.status !== 'sent') return 'pending';
    const createdMs = new Date(campaign.created).getTime();
    if (Number.isNaN(createdMs)) return 'pending';
    const age = Date.now() - createdMs;
    if (age >= SENT_TO_COMPLETED_MS) return 'completed';
    if (age >= PENDING_TO_SENT_MS) return 'sent';
    return 'pending';
  };

  const summaryRows = [
    { Field: 'Campaign Name', Value: campaign.name || '—' },
    { Field: 'Description', Value: campaign.description || '—' },
    { Field: 'Status', Value: campaign.status || '—' },
    { Field: 'Created', Value: formatDate(campaign.created) },
    { Field: 'Scheduled Time', Value: campaign.scheduled_time ? formatDate(campaign.scheduled_time) : '—' },
    { Field: 'Message', Value: campaign.message || '—' },
    { Field: 'Total Recipients', Value: campaign.total_recipients || 0 },
    { Field: 'Valid Numbers', Value: campaign.valid_count || 0 },
    { Field: 'Invalid Numbers', Value: campaign.invalid_count || 0 },
    { Field: 'SMS Parts', Value: campaign.sms_parts || 1 },
    { Field: 'Credits Used', Value: campaign.credits_used || 0 },
    { Field: 'Pending', Value: campaign.pending_count || 0 },
    { Field: 'Sent', Value: campaign.sent_count || 0 },
    { Field: 'Delivered/Completed', Value: campaign.completed_count || 0 },
    { Field: 'Failed', Value: campaign.failed_count || 0 },
  ];

  const recipientRows = (recipients || []).map((r, i) => ({
    '#': i + 1,
    'Phone Number': r.p || '—',
    'Type': r && r.v !== false ? 'Valid' : 'Invalid',
    'Delivery Status': recipientStatus(r).toUpperCase(),
  }));

  const safeName = (campaign.name || 'campaign').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  downloadExcel(
    [
      { name: 'Summary', rows: summaryRows },
      { name: 'Recipients', rows: recipientRows.length ? recipientRows : [{ 'Phone Number': 'No recipients available' }] },
    ],
    `campaign_${safeName}_${campaign.id || ''}.xlsx`,
  );
};

// Export the filtered campaign-wise delivery report (Delivery Logs page).
// Respects the current search/date/sort scope by accepting the already-
// filtered + sorted campaign list shown in the table.
export const exportDeliveryReport = (campaigns) => {
  const deliveryStatusOf = (c) => {
    const valid = c.valid_count || 0;
    const completed = c.completed_count || 0;
    const sent = c.sent_count || 0;
    const pending = c.pending_count || 0;
    if (valid > 0 && completed >= valid) return 'completed';
    if (sent > 0) return 'sent';
    if (pending > 0) return 'pending';
    if (valid === 0) return 'failed';
    return 'pending';
  };

  const rows = (campaigns || []).map((c) => ({
    'Date': formatDateShort(c.created),
    'Name': c.name || '—',
    'SenderID': senderFromDescription(c.description),
    'Message': c.message || '—',
    'Interface': 'Web',
    'Channel': channelFromDescription(c.description),
    'Total Recipients': c.total_recipients || 0,
    'Valid Numbers': c.valid_count || 0,
    'Invalid Numbers': c.invalid_count || 0,
    'SMS Parts': c.sms_parts || 1,
    'Credit Used': c.credits_used || 0,
    'Pending': c.pending_count || 0,
    'Sent': c.sent_count || 0,
    'Completed': c.completed_count || 0,
    'Failed': c.failed_count || 0,
    'Status': deliveryStatusOf(c).toUpperCase(),
  }));

  downloadExcel(
    [{ name: 'Campaign Report', rows: rows.length ? rows : [{ 'Name': 'No data available' }] }],
    `campaign_report_${new Date().toISOString().split('T')[0]}.xlsx`,
  );
};

// Export the filtered International SMS delivery report (SMS Reports page).
// Accepts the already-filtered log list so the downloaded file matches the
// user's current search/date view exactly.
export const exportSmsReports = (logs) => {
  const rows = (logs || []).map((log) => ({
    'To': log.to || '—',
    'Message': log.message || '—',
    'Sent At (IST)': formatIST(log.sent_at || log.created),
    'Delivered At (IST)': formatIST(log.delivered_at),
    'Duration': log.status === 'delivered' ? formatDuration(log.delivery_duration_seconds) : '—',
    'Status': (log.status || 'queued').toUpperCase(),
    'Request ID': log.request_id || '—',
  }));

  downloadExcel(
    [{ name: 'SMS Report', rows: rows.length ? rows : [{ 'To': 'No data available' }] }],
    `sms_report_${new Date().toISOString().split('T')[0]}.xlsx`,
  );
};
