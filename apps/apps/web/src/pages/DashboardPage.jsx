import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Users, Send, MessageSquare, TrendingUp, RefreshCw, AlertTriangle, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import StatsCard from '@/components/StatsCard.jsx';
import { useDashboardStats } from '@/hooks/useDashboardStats.js';
import { useDashboardReport } from '@/hooks/useDashboardReport.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

// Format an ISO timestamp as IST: "05 Oct 2025, 02:15:30 PM".
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

const statusBadge = (status) => {
  switch (status) {
    case 'delivered':
      return 'bg-success/15 text-success border-success/20';
    case 'failed':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'sent':
      return 'bg-accent/10 text-accent border-accent/20';
    case 'queued':
    default:
      return 'bg-primary/10 text-primary border-primary/20';
  }
};

const DashboardPage = () => {
  const { stats, loading, fetchStats } = useDashboardStats();
  const { currentUser, canUseInternational, canUseDomestic, isAdmin } = useAuth();

  // Live report fetch — only for International-enabled accounts. Domestic-only
  // users keep their existing domestic credit display and don't get spurious
  // low-balance modals.
  const {
    creditsLeft,
    creditsUnlimited,
    logs,
    loading: reportLoading,
    lowBalance,
    error: reportError,
    refresh: refreshReport,
    dismissLowBalance,
  } = useDashboardReport(canUseInternational);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Admins have unlimited International SMS credits (server-side bypass), so
  // mirror the domestic credit balance for the Intl display instead of
  // showing 0. Regular users show the live credits_left from the report.
  const intlCredits = isAdmin ? (currentUser?.credits || 0) : creditsLeft;
  const intlUnlimited = isAdmin || creditsUnlimited;

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Dashboard - Bharat Bulk SMS</title>
        </Helmet>
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1 py-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse"></div>
                ))}
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - Bharat Bulk SMS</title>
        <meta name="description" content="View your Bharat Bulk SMS campaign analytics, live credit balance and SMS delivery logs" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <div className="bg-accent text-accent-foreground py-8 mb-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold mb-2">Dashboard - Bharat Bulk SMS</h1>
            <p className="text-accent-foreground/80">Overview of your SMS campaigns and contacts</p>
            <div className="flex flex-wrap gap-3 mt-4">
              {canUseDomestic && (
                <div className="bg-white/10 rounded-lg px-4 py-2">
                  <p className="text-xs uppercase tracking-wider opacity-80">Domestic Credits (SIM)</p>
                  <p className="text-xl font-bold">{currentUser?.credits || 0}</p>
                </div>
              )}
              {canUseInternational && (
                <div className="bg-white/10 rounded-lg px-4 py-2">
                  <p className="text-xs uppercase tracking-wider opacity-80">
                    International Credits (Twilio){intlUnlimited ? ' · Unlimited' : ''}
                  </p>
                  <p className="text-xl font-bold">
                    {intlUnlimited ? '∞' : intlCredits.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="flex-1 pb-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Live credit balance card */}
            {canUseInternational && (
              <Card className="border-accent/20 shadow-sm mb-8 -mt-16">
                <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Wallet className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Credits Left</p>
                      <p className="text-3xl font-bold text-accent">
                        {intlUnlimited ? 'Unlimited' : creditsLeft.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">1 credit = 1 SMS · auto-refreshes every 10s</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshReport}
                    disabled={reportLoading}
                    className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${reportLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatsCard title="Total contacts" value={stats.totalContacts.toLocaleString()} icon={Users} />
              <StatsCard title="Active campaigns" value={stats.activeCampaigns} icon={TrendingUp} />
              <StatsCard title="Messages sent" value={stats.messagesSent.toLocaleString()} icon={Send} />
              <StatsCard title="Delivery rate" value="94.2%" icon={MessageSquare} trend="up" trendValue="+2.4%" />
            </div>

            {/* Live SMS reports table */}
            {canUseInternational && (
              <Card className="border-accent/20 shadow-sm mb-8">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-accent flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    SMS Reports
                  </CardTitle>
                  <Button variant="outline" size="sm" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground" asChild>
                    <Link to="/reports">View full reports</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {reportError ? (
                    <div className="text-center py-10 text-destructive">
                      <p>{reportError}</p>
                      <Button variant="outline" className="mt-4" onClick={refreshReport}>Retry</Button>
                    </div>
                  ) : reportLoading && logs.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin inline-block mr-2 text-primary" />
                      Loading reports...
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <p>No SMS logs yet. Send a campaign to see delivery reports here.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto -mx-2">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-muted-foreground">
                          <tr>
                            <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">To</th>
                            <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">From</th>
                            <th className="text-left px-3 py-2.5 font-semibold">Message</th>
                            <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">OTP</th>
                            <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Time (IST)</th>
                            <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                              <td className="px-3 py-3 font-mono whitespace-nowrap">{log.to_number || '—'}</td>
                              <td className="px-3 py-3 font-mono whitespace-nowrap text-muted-foreground">{log.from_number || '—'}</td>
                              <td className="px-3 py-3 max-w-[240px] truncate text-muted-foreground" title={log.message}>
                                {log.message || '—'}
                              </td>
                              <td className="px-3 py-3 font-mono whitespace-nowrap">
                                {log.otp ? (
                                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">{log.otp}</span>
                                ) : '—'}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-xs">{formatIST(log.time)}</td>
                              <td className="px-3 py-3">
                                <Badge variant="outline" className={statusBadge(log.status)}>
                                  {log.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-accent text-accent-foreground border-none shadow-md">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-2">Import contacts</h3>
                  <p className="mb-4 opacity-90">Upload a CSV file to add contacts in bulk</p>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 border-none" asChild>
                    <Link to="/contacts">Go to contacts</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-secondary text-secondary-foreground border-none shadow-md">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-2">Create campaign</h3>
                  <p className="mb-4 opacity-90">Compose and schedule your next SMS campaign</p>
                  <Button variant="outline" className="bg-transparent border-secondary-foreground/30 text-secondary-foreground hover:bg-secondary-foreground hover:text-secondary" asChild>
                    <Link to="/campaigns/compose">Compose message</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* Low Balance modal — shown when the report API responds with HTTP 402 */}
      <Dialog open={lowBalance} onOpenChange={(o) => { if (!o) dismissLowBalance(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Low Balance
            </DialogTitle>
            <DialogDescription>
              Your International SMS credit balance has run out. You won't be able to send new
              SMS campaigns until credits are added. Please contact your admin to top up your
              account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={dismissLowBalance}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DashboardPage;
