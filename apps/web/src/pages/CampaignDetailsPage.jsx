import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Calendar, MessageSquare, RotateCw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import StatsCard from '@/components/StatsCard.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useCampaigns } from '@/hooks/useCampaigns.js';
import { advanceDeliveryStatuses } from '@/lib/advanceDeliveryStatuses';
import { exportCampaignDetails } from '@/lib/exportExcel.js';
import { Download } from 'lucide-react';

const PENDING_TO_SENT_MS = 30 * 1000;
const SENT_TO_COMPLETED_MS = 120 * 1000;

// Derive a per-recipient delivery status. Invalid numbers are always "failed".
// Valid numbers follow the same age-based progression as the aggregate counts
// (pending → sent → completed) for sent campaigns; drafts/scheduled stay pending.
const recipientStatus = (r, campaign) => {
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

const statusBadgeClass = (status) => {
  if (status === 'completed' || status === 'delivered') return 'bg-sms-green/10 text-sms-green border-sms-green/20';
  if (status === 'failed') return 'bg-destructive/10 text-destructive border-destructive/20';
  if (status === 'sent') return 'bg-sms-navy/10 text-sms-navy border-sms-navy/20';
  return 'bg-sms-orange/10 text-sms-orange border-sms-orange/20';
};

const CampaignDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 25;
  const { getCampaignDetails } = useCampaigns();
  const { isAdmin } = useAuth();

  const loadCampaign = async () => {
    try {
      const data = await getCampaignDetails(id);
      setCampaign(data.campaign);
      setRecipients(data.recipients || []);
    } catch (error) {
      console.error('Load campaign error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaign();
    // Keep the aggregate delivery counts fresh while the campaign progresses
    // pending → sent → completed.
    const interval = setInterval(async () => {
      try {
        await advanceDeliveryStatuses();
      } catch (_) {}
      loadCampaign();
    }, 15000);
    return () => clearInterval(interval);
  }, [id, getCampaignDetails]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-muted text-muted-foreground border-muted-foreground/20';
      case 'scheduled': return 'bg-primary/10 text-primary border-primary/20';
      case 'sent': return 'bg-accent/10 text-accent border-accent/20';
      default: return 'bg-muted text-muted-foreground border-muted-foreground/20';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Recipient list with search + pagination (client-side). For 50k recipients
  // we only render the current page slice, so the table stays responsive.
  // These hooks must run before any early return so hook order is stable.
  const filteredRecipients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter((r) => String(r.p || '').toLowerCase().includes(q));
  }, [recipients, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="h-96 bg-muted/50 rounded-xl animate-pulse"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="text-center">
             <h2 className="text-2xl font-bold mb-4 text-accent">Campaign not found</h2>
             <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate('/campaigns')}>Back to campaigns</Button>
          </div>
        </main>
      </div>
    );
  }

  // Aggregate delivery stats live directly on the campaign record, so this
  // page scales to any recipient volume (50k+) without per-recipient rows.
  const stats = {
    total: campaign.total_recipients || 0,
    pending: campaign.pending_count || 0,
    sent: campaign.sent_count || 0,
    delivered: campaign.completed_count || 0,
    failed: campaign.failed_count || 0
  };
  
  const deliveryRate = stats.total > 0 ? Math.round(((stats.delivered + stats.sent) / stats.total) * 100) : 0;

  const totalFiltered = filteredRecipients.length;
  const totalPages = Math.ceil(totalFiltered / perPage) || 1;
  const currentPage = Math.min(page, totalPages);
  const pageRecipients = filteredRecipients.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  return (
    <>
      <Helmet>
        <title>{`${campaign.name} - Bharat Bulk SMS`}</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <Button variant="ghost" onClick={() => navigate('/campaigns')} className="mb-6 text-accent hover:text-primary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to campaigns
            </Button>

            <div className="mb-8 border-b border-accent/10 pb-8">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2 tracking-tight text-accent">{campaign.name}</h1>
                  {campaign.description && <p className="text-muted-foreground">{campaign.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={`px-3 py-1 text-sm ${getStatusColor(campaign.status)}`}>{campaign.status}</Badge>
                  <Button
                    className="bg-sms-green text-white hover:bg-sms-green/90"
                    onClick={() => exportCampaignDetails(campaign, recipients)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Excel
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /><span>Created {formatDate(campaign.created)}</span></div>
                {campaign.scheduled_time && (
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /><span>Scheduled for {formatDate(campaign.scheduled_time)}</span></div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <StatsCard title="Total" value={stats.total.toLocaleString()} icon={MessageSquare} />
              <StatsCard title="Pending" value={stats.pending.toLocaleString()} icon={MessageSquare} className="border-status-pending/50" />
              <StatsCard title="Sent" value={stats.sent.toLocaleString()} icon={MessageSquare} className="border-status-sent/50" />
              <StatsCard title="Delivered" value={stats.delivered.toLocaleString()} icon={MessageSquare} className="border-status-delivered/50" />
              <StatsCard title="Failed" value={stats.failed.toLocaleString()} icon={MessageSquare} className="border-status-failed/50" />
              <StatsCard title="Success Rate" value={`${deliveryRate}%`} icon={MessageSquare} />
            </div>

            {/* Delivery-cap summary: total uploaded vs actually sent via SMPP
                vs skipped due to the user's delivery-percentage cap. */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card className="shadow-sm border-accent/20 bg-card">
                <CardContent className="pt-6">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Uploaded</div>
                  <div className="text-3xl font-bold text-accent">{(campaign.total_numbers || campaign.total_recipients || 0).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">Recipient numbers submitted</div>
                </CardContent>
              </Card>
              {isAdmin && (
                <>
                  <Card className="shadow-sm border-sms-green/30 bg-card">
                    <CardContent className="pt-6">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Actually Sent via SMPP</div>
                      <div className="text-3xl font-bold text-sms-green">
                        {(campaign.actual_sent_count || 0).toLocaleString()}
                        <span className="text-base font-semibold text-muted-foreground ml-2">
                          ({campaign.delivery_percentage_applied || 100}%)
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Numbers dispatched to the SMSC</div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm border-sms-orange/30 bg-card">
                    <CardContent className="pt-6">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skipped due to Cap</div>
                      <div className="text-3xl font-bold text-sms-orange">
                        {Math.max(0, (campaign.total_numbers || campaign.total_recipients || 0) - (campaign.actual_sent_count || 0)).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Held back by delivery % cap</div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card className="shadow-sm border-accent/20">
                <CardHeader>
                  <CardTitle className="text-accent">Message Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm border border-accent/10">
                    <p className="whitespace-pre-wrap text-foreground">{campaign.message}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-accent/20">
                <CardHeader>
                  <CardTitle className="text-accent">Campaign Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-accent/10">
                      <span className="text-muted-foreground">Valid Numbers</span>
                      <span className="font-bold text-accent">{(campaign.valid_count || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-accent/10">
                      <span className="text-muted-foreground">Invalid Numbers</span>
                      <span className="font-bold text-accent">{(campaign.invalid_count || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-accent/10">
                      <span className="text-muted-foreground">SMS Parts</span>
                      <span className="font-bold text-accent">{campaign.sms_parts || 1}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-accent/10">
                      <span className="text-muted-foreground">Credits Used</span>
                      <span className="font-bold text-accent">{(campaign.credits_used || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm border-accent/20">
              <CardHeader className="border-b border-accent/10 pb-4">
                <CardTitle className="text-accent flex items-center gap-2">
                  <RotateCw className="h-4 w-4 text-primary" />
                  Delivery Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-sms-orange/10 rounded-lg p-4 text-center border border-sms-orange/20">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pending</div>
                    <div className="text-2xl font-bold text-sms-orange">{stats.pending.toLocaleString()}</div>
                  </div>
                  <div className="bg-sms-navy/10 rounded-lg p-4 text-center border border-sms-navy/20">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Sent</div>
                    <div className="text-2xl font-bold text-sms-navy">{stats.sent.toLocaleString()}</div>
                  </div>
                  <div className="bg-sms-green/10 rounded-lg p-4 text-center border border-sms-green/20">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Completed</div>
                    <div className="text-2xl font-bold text-sms-green">{stats.delivered.toLocaleString()}</div>
                  </div>
                  <div className="bg-destructive/10 rounded-lg p-4 text-center border border-destructive/20">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Failed</div>
                    <div className="text-2xl font-bold text-destructive">{stats.failed.toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recipient phone-number report. Shows every number the campaign
                targeted (valid + invalid) with per-recipient delivery status. */}
            <Card className="shadow-sm border-accent/20 mt-6">
              <CardHeader className="border-b border-accent/10 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-accent flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Recipient Report
                    <span className="text-sm font-normal text-muted-foreground">({totalFiltered.toLocaleString()} numbers)</span>
                  </CardTitle>
                  <div className="relative w-full sm:w-[260px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search phone number..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="max-h-[480px] overflow-y-auto">
                    <Table>
                      <TableHeader className="table-header-navy sticky top-0 z-10">
                        <TableRow className="hover:bg-transparent border-b-0">
                          <TableHead className="text-white w-20">#</TableHead>
                          <TableHead className="text-white">Phone Number</TableHead>
                          <TableHead className="text-white">Type</TableHead>
                          <TableHead className="text-white">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pageRecipients.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                              No recipient numbers available for this campaign
                            </TableCell>
                          </TableRow>
                        ) : (
                          pageRecipients.map((r, idx) => {
                            const status = recipientStatus(r, campaign);
                            const valid = r && r.v !== false;
                            return (
                              <TableRow key={(r.p || '') + idx} className="hover:bg-muted/50">
                                <TableCell className="text-sm text-muted-foreground font-mono">
                                  {(currentPage - 1) * perPage + idx + 1}
                                </TableCell>
                                <TableCell className="font-mono text-sm">{r.p || '—'}</TableCell>
                                <TableCell className="text-sm">
                                  <Badge variant="outline" className={valid ? 'bg-sms-green/10 text-sms-green border-sms-green/20' : 'bg-destructive/10 text-destructive border-destructive/20'}>
                                    {valid ? 'Valid' : 'Invalid'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">
                                  <Badge variant="outline" className={statusBadgeClass(status)}>
                                    {status.toUpperCase()}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {totalFiltered > perPage && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 text-sm">
                    <div className="text-muted-foreground">
                      Showing {(currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, totalFiltered)} of {totalFiltered.toLocaleString()} entries
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="px-3 py-1.5 rounded-md bg-sms-navy text-white font-medium text-sm mx-1">{currentPage}</div>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default CampaignDetailsPage;
