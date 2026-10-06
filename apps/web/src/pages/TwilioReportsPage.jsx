import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { RefreshCw, MessageSquare, CheckCircle2, XCircle, Clock, Send, Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { exportSmsReports } from '@/lib/exportExcel.js';
import { toast } from 'sonner';

const statusMeta = {
  queued: { label: 'Queued', class: 'bg-sms-orange/10 text-sms-orange border-sms-orange/20', Icon: Clock },
  sent: { label: 'Sent', class: 'bg-sms-navy/10 text-sms-navy border-sms-navy/20', Icon: Send },
  delivered: { label: 'Delivered', class: 'bg-sms-green/10 text-sms-green border-sms-green/20', Icon: CheckCircle2 },
  failed: { label: 'Failed', class: 'bg-destructive/10 text-destructive border-destructive/20', Icon: XCircle },
};

// Format a timestamp as IST: "05 Oct 2025, 02:15:30 PM". Uses Intl with the
// Asia/Kolkata timezone so it is correct regardless of the browser's locale.
function formatIST(date) {
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
}

// Human-readable delivery duration: "4s" or "1m 12s" when over a minute.
function formatDuration(seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s)) return '—';
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m ${rem}s`;
}

const TwilioReportsPage = () => {
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState([]);
  const [credits, setCredits] = useState(0);
  const [creditsUnlimited, setCreditsUnlimited] = useState(false);
  const [provisioned, setProvisioned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchReports = useCallback(async () => {
    try {
      const res = await apiServerClient.fetch('/twilio/reports', {
        headers: { Authorization: pb.authStore.token },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load reports');
      }
      setLogs(data.logs || []);
      setCredits(data.sms_credits ?? 0);
      setCreditsUnlimited(!!data.credits_unlimited);
      setProvisioned(!!data.sub_account_provisioned);
    } catch (e) {
      toast.error(e.message || 'Failed to load reports');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
    // Poll every 15s so live status updates from the webhook show up.
    const id = setInterval(fetchReports, 15000);
    return () => clearInterval(id);
  }, [fetchReports]);

  const handleSync = () => {
    setSyncing(true);
    fetchReports();
  };

  // Client-side filtering by date range (on sent_at) and free-text search
  // across the recipient number and request_id.
  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      const sentDateOnly = log.sent_at ? log.sent_at.slice(0, 10) : '';
      if (dateFrom && (sentDateOnly < dateFrom)) return false;
      if (dateTo && (sentDateOnly > dateTo)) return false;
      if (q) {
        const to = (log.to || '').toLowerCase();
        const rid = (log.request_id || '').toLowerCase();
        if (!to.includes(q) && !rid.includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, dateFrom, dateTo]);

  const stats = {
    total: logs.length,
    delivered: logs.filter((l) => l.status === 'delivered').length,
    failed: logs.filter((l) => l.status === 'failed').length,
    pending: logs.filter((l) => l.status === 'queued' || l.status === 'sent').length,
  };

  // Admins have unlimited International SMS credits (server-side bypass), so
  // mirror the domestic credit balance for the display instead of showing 0.
  const displayCredits = creditsUnlimited ? (currentUser?.credits || 0) : credits;

  return (
    <>
      <Helmet>
        <title>SMS Reports - Bharat Bulk SMS</title>
        <meta name="description" content="View your Twilio SMS delivery reports with exact sent, delivered and failed timestamps." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
              <Link to="/dashboard" className="hover:text-sms-navy transition-colors">Dashboard</Link>
              <span>/</span>
              <span className="text-sms-navy font-medium">SMS Reports</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <h1 className="text-3xl font-bold text-sms-navy">SMS Reports</h1>
              <div className="flex items-center gap-2">
                <Button
                  className="bg-sms-green text-white hover:bg-sms-green/90"
                  onClick={() => {
                    if (!filteredLogs || filteredLogs.length === 0) {
                      toast.error('No data available to export');
                      return;
                    }
                    exportSmsReports(filteredLogs);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download as Excel
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSync}
                  disabled={syncing}
                  className="border-sms-navy text-sms-navy hover:bg-sms-navy hover:text-white"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  Sync Live Status
                </Button>
              </div>
            </div>

            {/* Credit + provisioning banner */}
            <Card className="border border-border shadow-sm p-5 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Twilio SMS Credits</div>
                  <div className="text-3xl font-bold text-sms-navy">{displayCredits.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">1 credit = 1 SMS = Rs 4</div>
                </div>
                <div className="flex items-center gap-2">
                  {provisioned ? (
                    <Badge className="bg-sms-green/10 text-sms-green border-sms-green/20">Sub-account active</Badge>
                  ) : (
                    <Badge className="bg-sms-orange/10 text-sms-orange border-sms-orange/20">No Twilio sub-account</Badge>
                  )}
                </div>
              </div>
              {!provisioned && (
                <p className="text-xs text-muted-foreground mt-3">
                  Your account doesn't have a Twilio sub-account yet. Contact an admin to provision one and add credits.
                </p>
              )}
            </Card>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4 border border-border">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Sent</div>
                <div className="text-2xl font-bold text-sms-navy mt-1">{stats.total}</div>
              </Card>
              <Card className="p-4 border border-border">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Delivered</div>
                <div className="text-2xl font-bold text-sms-green mt-1">{stats.delivered}</div>
              </Card>
              <Card className="p-4 border border-border">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Pending</div>
                <div className="text-2xl font-bold text-sms-orange mt-1">{stats.pending}</div>
              </Card>
              <Card className="p-4 border border-border">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Failed</div>
                <div className="text-2xl font-bold text-destructive mt-1">{stats.failed}</div>
              </Card>
            </div>

            {/* Filters */}
            <Card className="border border-border shadow-sm p-4 mb-4">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by recipient number or request ID…"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Sent from
                  </label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="md:w-44" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Sent to
                  </label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="md:w-44" />
                </div>
                {(search || dateFrom || dateTo) && (
                  <Button
                    variant="ghost"
                    onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </Card>

            {/* Logs table */}
            <Card className="border border-border shadow-sm overflow-hidden">
              <div className="bg-navy text-navy-foreground px-4 py-3 font-semibold text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                SMS Delivery Logs
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">To</th>
                      <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Sender</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Message</th>
                      <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Sent At (IST)</th>
                      <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Delivered At (IST)</th>
                      <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Duration</th>
                      <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Status</th>
                      <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Request ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-muted-foreground">
                          <RefreshCw className="h-5 w-5 animate-spin inline-block mr-2 text-sms-orange" />
                          Loading logs...
                        </td>
                      </tr>
                    ) : filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-muted-foreground">
                          {logs.length === 0
                            ? 'No SMS logs yet. Send a campaign to see delivery reports here.'
                            : 'No logs match your filters.'}
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => {
                        const meta = statusMeta[log.status] || statusMeta.queued;
                        const Icon = meta.Icon;
                        const preview = (log.message || '').slice(0, 30);
                        return (
                          <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                            <td className="px-4 py-3 font-mono whitespace-nowrap">{log.to || '—'}</td>
                            <td className="px-4 py-3 font-mono whitespace-nowrap text-muted-foreground">{log.from_number || '—'}</td>
                            <td className="px-4 py-3 max-w-[220px] truncate text-muted-foreground" title={log.message}>
                              {preview || '—'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs">{formatIST(log.sent_at || log.created)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs">{formatIST(log.delivered_at)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs">
                              {log.status === 'delivered' ? formatDuration(log.delivery_duration_seconds) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={meta.class}>
                                <Icon className="h-3 w-3 mr-1" />
                                {meta.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                              {log.request_id || '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default TwilioReportsPage;
