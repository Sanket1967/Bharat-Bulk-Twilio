import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Search, 
  AlertTriangle, 
  Eye, 
  ChevronUp, 
  ChevronDown, 
  ChevronsLeft, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsRight,
  Calendar,
  RotateCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import pb from '@/lib/pocketbaseClient';
import { loadRecipientChunks } from '@/lib/campaignRecipients';
import { toast } from 'sonner';
import { advanceDeliveryStatuses } from '@/lib/advanceDeliveryStatuses';
import { exportDeliveryReport } from '@/lib/exportExcel.js';
import { Download } from 'lucide-react';

// The campaign description is stored as "Channel: X, Route: Y, Sender: Z".
// Pull the sender / channel back out for the report columns.
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

// Overall delivery progression for a campaign, derived from its aggregate
// counters: pending → sent → completed (failed when there were no valid numbers).
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

const STATUS_PRIORITY = { pending: 0, sent: 1, completed: 2, failed: 3 };

const DeliveryLogsPage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Sorting
  const [sortColumn, setSortColumn] = useState('deliveryStatus');
  const [sortDirection, setSortDirection] = useState('asc');

  // Modal
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [modalRecipients, setModalRecipients] = useState([]);
  const [modalLoadingRecipients, setModalLoadingRecipients] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const filterParts = ['status = "sent"'];
      
      if (startDate) {
        filterParts.push(`created >= "${startDate} 00:00:00"`);
      }
      if (endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split('T')[0];
        filterParts.push(`created < "${nextDayStr} 00:00:00"`);
      }

      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        filterParts.push(`name ~ "${searchLower}"`);
      }

      const filterString = filterParts.join(' && ');

      // PB-native sorting for columns that map to real fields.
      let sortString = '-created';
      const dir = sortDirection === 'desc' ? '-' : '';
      if (sortColumn === 'created') sortString = `${dir}created`;
      else if (sortColumn === 'name') sortString = `${dir}name`;
      else if (sortColumn === 'credit') sortString = `${dir}credits_used`;

      const result = await pb.collection('campaigns').getList(page, perPage, {
        filter: filterString,
        sort: sortString,
        // Exclude the per-recipient JSON blob from list responses — it can be
        // large (50k numbers) and isn't needed for the report table. The view
        // modal fetches recipients separately via getOne.
        fields: 'id,created,updated,name,description,message,scheduled_time,status,created_by,total_recipients,valid_count,invalid_count,sms_parts,credits_used,pending_count,sent_count,completed_count,failed_count',
        $autoCancel: false
      });

      setCampaigns(result.items);
      setTotalItems(result.totalItems);
    } catch (error) {
      toast.error('Failed to load campaign report');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, debouncedSearch, startDate, endDate, sortColumn, sortDirection]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Advance campaign delivery counts by age, then refresh the table every 10s
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        await advanceDeliveryStatuses();
      } catch (_) {
        /* ignore */
      }
      if (!cancelled) {
        fetchCampaigns();
      }
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fetchCampaigns]);

  // Local sorting for the computed delivery-status column (pending → sent → completed).
  const sortedCampaigns = useMemo(() => {
    if (sortColumn !== 'deliveryStatus') return campaigns;
    return [...campaigns].sort((a, b) => {
      const priorityA = STATUS_PRIORITY[deliveryStatusOf(a)] ?? 99;
      const priorityB = STATUS_PRIORITY[deliveryStatusOf(b)] ?? 99;
      if (priorityA !== priorityB) {
        return sortDirection === 'asc' ? priorityA - priorityB : priorityB - priorityA;
      }
      return new Date(b.created) - new Date(a.created);
    });
  }, [campaigns, sortColumn, sortDirection]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }) => {
    if (sortColumn !== column) return <ChevronUp className="h-3 w-3 opacity-30 ml-1 inline-block" />;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-3 w-3 ml-1 inline-block text-sms-orange" /> : 
      <ChevronDown className="h-3 w-3 ml-1 inline-block text-sms-orange" />;
  };

  const totalPages = Math.ceil(totalItems / perPage) || 1;

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const openViewModal = async (campaign) => {
    setSelectedCampaign(campaign);
    setIsModalOpen(true);
    setModalRecipients([]);
    setModalLoadingRecipients(true);
    try {
      // Recipients live on the campaign record as a JSON array. Older
      // campaigns fall back to the messages collection for phone numbers.
      let recs = Array.isArray(campaign.recipients) ? campaign.recipients : null;
      if (!recs || recs.length === 0) {
        try {
          recs = await loadRecipientChunks(campaign.id);
        } catch (e) { /* ignore */ }
      }
      if (!recs || recs.length === 0) {
        try {
          const fresh = await pb.collection('campaigns').getOne(campaign.id, { $autoCancel: false });
          recs = Array.isArray(fresh.recipients) ? fresh.recipients : null;
        } catch (e) { /* ignore */ }
      }
      if (!recs || recs.length === 0) {
        try {
          const msgs = await pb.collection('messages').getFullList({
            filter: `campaign_id = "${campaign.id}"`,
            $autoCancel: false,
          });
          recs = msgs.map((m) => ({ p: m.phone, v: true, status: m.status }));
        } catch (e) { /* ignore */ }
      }
      setModalRecipients(recs || []);
    } catch (e) {
      console.error('Load modal recipients failed', e);
    } finally {
      setModalLoadingRecipients(false);
    }
  };

  const statusBadgeClass = (status) => {
    if (status === 'completed') return 'bg-sms-green/10 text-sms-green border-sms-green/20';
    if (status === 'failed') return 'bg-destructive/10 text-destructive border-destructive/20';
    if (status === 'sent') return 'bg-sms-navy/10 text-sms-navy border-sms-navy/20';
    return 'bg-sms-orange/10 text-sms-orange border-sms-orange/20';
  };

  return (
    <>
      <Helmet>
        <title>Campaign Wise Report - Bharat Bulk SMS</title>
        <meta name="description" content="View detailed campaign wise reports and delivery logs" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            
            {/* Breadcrumb */}
            <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
              <Link to="/" className="hover:text-sms-navy transition-colors">Home</Link>
              <span>/</span>
              <Link to="/dashboard" className="hover:text-sms-navy transition-colors">Dashboard</Link>
              <span>/</span>
              <span className="text-sms-navy font-medium">Campaign Wise Report</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <h1 className="text-3xl font-bold text-sms-navy">Campaign Wise Report</h1>
              <Button
                className="bg-sms-green text-white hover:bg-sms-green/90"
                onClick={() => {
                  if (!sortedCampaigns || sortedCampaigns.length === 0) {
                    toast.error('No data available to export');
                    return;
                  }
                  exportDeliveryReport(sortedCampaigns);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Excel
              </Button>
            </div>

            {/* Alert Banner */}
            <div className="alert-banner-orange mb-8">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Alert! For all promotional campaigns, please use RCS messages instead of SMS. RCS ensures richer content.</p>
              </div>
            </div>

            {/* Filters & Controls */}
            <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-end lg:items-center">
              
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-sms-navy uppercase tracking-wider">Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="pl-9 border-border focus-visible:ring-sms-orange w-full sm:w-[160px]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-sms-navy uppercase tracking-wider">End Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="pl-9 border-border focus-visible:ring-sms-orange w-full sm:w-[160px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto items-end sm:items-center">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Show</span>
                  <Select value={perPage.toString()} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                    <SelectTrigger className="w-[80px] border-border focus:ring-sms-orange">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">entries</span>
                </div>

                <div className="relative w-full sm:w-[250px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search campaigns..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 border-border focus-visible:ring-sms-orange w-full"
                  />
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm mb-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="table-header-navy">
                    <TableRow className="hover:bg-transparent border-b-0">
                      <TableHead className="text-white cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('created')}>
                        Date <SortIcon column="created" />
                      </TableHead>
                      <TableHead className="text-white cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('name')}>
                        Name <SortIcon column="name" />
                      </TableHead>
                      <TableHead className="text-white whitespace-nowrap">
                        SenderID
                      </TableHead>
                      <TableHead className="text-white min-w-[200px]">
                        Message
                      </TableHead>
                      <TableHead className="text-white whitespace-nowrap">
                        Interface
                      </TableHead>
                      <TableHead className="text-white whitespace-nowrap">
                        Channel
                      </TableHead>
                      <TableHead className="text-white cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('credit')}>
                        Credit Used <SortIcon column="credit" />
                      </TableHead>
                      <TableHead className="text-white cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('deliveryStatus')}>
                        Status <SortIcon column="deliveryStatus" />
                      </TableHead>
                      <TableHead className="text-white text-center whitespace-nowrap">
                        View
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                          <div className="flex justify-center items-center gap-2">
                            <RotateCw className="h-5 w-5 animate-spin text-sms-orange" /> Loading report data...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : sortedCampaigns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12 text-muted-foreground font-medium">
                          No data available in table
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedCampaigns.map((campaign) => {
                        const messageText = campaign.message || '—';
                        const truncatedMessage = messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText;
                        const deliveryStatus = deliveryStatusOf(campaign);
                        const creditsUsed = campaign.credits_used || 0;
                        
                        return (
                          <TableRow key={campaign.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="whitespace-nowrap text-sm font-medium">
                              {formatDate(campaign.created)}
                            </TableCell>
                            <TableCell className="font-medium text-sms-navy">
                              {campaign.name}
                            </TableCell>
                            <TableCell className="text-sm">
                              <Badge variant="outline" className="bg-muted text-muted-foreground border-border">{senderFromDescription(campaign.description)}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate" title={messageText}>
                              {truncatedMessage}
                            </TableCell>
                            <TableCell className="text-sm">
                              Web
                            </TableCell>
                            <TableCell className="text-sm">
                              <Badge variant="outline" className="bg-sms-navy/10 text-sms-navy border-sms-navy/20">{channelFromDescription(campaign.description)}</Badge>
                            </TableCell>
                            <TableCell className="text-sm font-mono text-center">
                              {creditsUsed.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-sm">
                              <Badge variant="outline" className={statusBadgeClass(deliveryStatus)}>
                                {deliveryStatus.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-sms-navy hover:text-sms-orange hover:bg-sms-orange/10 h-8 w-8"
                                onClick={() => openViewModal(campaign)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            {!loading && totalItems > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
                <div className="text-muted-foreground">
                  Showing {((page - 1) * perPage) + 1} to {Math.min(page * perPage, totalItems)} of {totalItems.toLocaleString()} entries
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 border-border text-sms-navy disabled:opacity-50"
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 border-border text-sms-navy disabled:opacity-50"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="px-4 py-1.5 rounded-md bg-sms-navy text-white font-medium text-sm mx-1">
                    {page}
                  </div>

                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 border-border text-sms-navy disabled:opacity-50"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 border-border text-sms-navy disabled:opacity-50"
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

          </div>
        </main>

        <Footer />
      </div>

      {/* View Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[520px] border-border">
          <DialogHeader>
            <DialogTitle className="text-sms-navy text-xl border-b pb-3">Campaign Details</DialogTitle>
          </DialogHeader>
          
          {selectedCampaign && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="font-semibold text-muted-foreground">Date:</div>
                <div className="col-span-2 font-medium">{formatDate(selectedCampaign.created)}</div>
                
                <div className="font-semibold text-muted-foreground">Campaign:</div>
                <div className="col-span-2 font-medium text-sms-navy">
                  {selectedCampaign.name}
                </div>

                <div className="font-semibold text-muted-foreground">Total Recipients:</div>
                <div className="col-span-2 font-mono">
                  {(selectedCampaign.total_recipients || 0).toLocaleString()}
                </div>

                <div className="font-semibold text-muted-foreground">Valid Numbers:</div>
                <div className="col-span-2 font-mono">
                  {(selectedCampaign.valid_count || 0).toLocaleString()}
                </div>

                <div className="font-semibold text-muted-foreground">Invalid Numbers:</div>
                <div className="col-span-2 font-mono">
                  {(selectedCampaign.invalid_count || 0).toLocaleString()}
                </div>

                <div className="font-semibold text-muted-foreground">SMS Parts:</div>
                <div className="col-span-2 font-mono">
                  {selectedCampaign.sms_parts || 1}
                </div>

                <div className="font-semibold text-muted-foreground">Credits Used:</div>
                <div className="col-span-2 font-mono">
                  {(selectedCampaign.credits_used || 0).toLocaleString()}
                </div>

                <div className="font-semibold text-muted-foreground">Status:</div>
                <div className="col-span-2">
                  <Badge variant="outline" className={statusBadgeClass(deliveryStatusOf(selectedCampaign))}>
                    {deliveryStatusOf(selectedCampaign).toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Delivery breakdown */}
              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-border">
                <div className="bg-sms-orange/10 rounded-md p-2 text-center">
                  <div className="text-xs text-muted-foreground">Pending</div>
                  <div className="font-bold text-sms-orange">{(selectedCampaign.pending_count || 0).toLocaleString()}</div>
                </div>
                <div className="bg-sms-navy/10 rounded-md p-2 text-center">
                  <div className="text-xs text-muted-foreground">Sent</div>
                  <div className="font-bold text-sms-navy">{(selectedCampaign.sent_count || 0).toLocaleString()}</div>
                </div>
                <div className="bg-sms-green/10 rounded-md p-2 text-center">
                  <div className="text-xs text-muted-foreground">Completed</div>
                  <div className="font-bold text-sms-green">{(selectedCampaign.completed_count || 0).toLocaleString()}</div>
                </div>
                <div className="bg-destructive/10 rounded-md p-2 text-center">
                  <div className="text-xs text-muted-foreground">Failed</div>
                  <div className="font-bold text-destructive">{(selectedCampaign.failed_count || 0).toLocaleString()}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <div className="font-semibold text-muted-foreground text-sm mb-2">Full Message:</div>
                <div className="bg-muted/30 p-3 rounded-md border border-border text-sm whitespace-pre-wrap">
                  {selectedCampaign.message || 'No message content available.'}
                </div>
              </div>

              {/* Recipient phone numbers targeted by this campaign */}
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-muted-foreground text-sm">Recipient Numbers:</div>
                  <Link
                    to={`/campaigns/${selectedCampaign.id}`}
                    className="text-xs text-sms-orange hover:underline"
                  >
                    View full report →
                  </Link>
                </div>
                <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-muted/20">
                  {modalLoadingRecipients ? (
                    <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                      <RotateCw className="h-4 w-4 animate-spin text-sms-orange" /> Loading numbers...
                    </div>
                  ) : modalRecipients.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No recipient numbers available.</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 p-3">
                      {modalRecipients.slice(0, 200).map((r, i) => (
                        <span
                          key={(r.p || '') + i}
                          className={`px-2 py-0.5 rounded text-xs font-mono border ${r.v === false ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-sms-navy/10 text-sms-navy border-sms-navy/20'}`}
                          title={r.v === false ? 'Invalid number — not charged' : 'Valid number'}
                        >
                          {r.p || '—'}
                        </span>
                      ))}
                      {modalRecipients.length > 200 && (
                        <span className="px-2 py-0.5 rounded text-xs text-muted-foreground">
                          +{(modalRecipients.length - 200).toLocaleString()} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end pt-2">
            <Button onClick={() => setIsModalOpen(false)} className="bg-sms-navy text-white hover:bg-sms-navy/90">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeliveryLogsPage;
