import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck, Download, Users, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import StatsCard from '@/components/StatsCard.jsx';
import pb from '@/lib/pocketbaseClient';

const ComplianceDashboard = () => {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({
    optInRate: '0%',
    totalOptedOut: 0,
    activeContacts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplianceData = async () => {
      try {
        const [historyRes, contactsRes] = await Promise.all([
          pb.collection('opt_in_history').getList(1, 50, {
            sort: '-created',
            expand: 'contact_id',
            $autoCancel: false
          }),
          pb.collection('contacts').getList(1, 1, {
            $autoCancel: false // to get totalItems
          })
        ]);

        const allContacts = await pb.collection('contacts').getFullList({ $autoCancel: false });
        const optedOut = allContacts.filter(c => !c.opted_in).length;
        const total = allContacts.length;
        
        setStats({
          optInRate: total > 0 ? `${Math.round(((total - optedOut) / total) * 100)}%` : '0%',
          totalOptedOut: optedOut,
          activeContacts: total - optedOut
        });

        setHistory(historyRes.items);
      } catch (error) {
        console.error('Failed to load compliance data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchComplianceData();
  }, []);

  const chartData = [
    { name: 'Mon', optins: 12, optouts: 1 },
    { name: 'Tue', optins: 19, optouts: 2 },
    { name: 'Wed', optins: 15, optouts: 0 },
    { name: 'Thu', optins: 22, optouts: 4 },
    { name: 'Fri', optins: 28, optouts: 1 },
    { name: 'Sat', optins: 9, optouts: 0 },
    { name: 'Sun', optins: 14, optouts: 1 },
  ];

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Contact', 'Action', 'Reason'].join(','),
      ...history.map(h => [
        new Date(h.created).toISOString(),
        h.expand?.contact_id?.phone || 'Unknown',
        h.action,
        `"${h.reason || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'bharat_bulk_sms_compliance_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Helmet>
        <title>Compliance - Bharat Bulk SMS</title>
        <meta name="description" content="Compliance and audit center for Bharat Bulk SMS" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2 tracking-tight flex items-center gap-2 text-accent">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                  Bharat Bulk SMS Compliance
                </h1>
                <p className="text-muted-foreground">Monitor consent rates, audit trails, and maintain regulatory compliance</p>
              </div>
              <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export Audit Log
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatsCard title="Global Opt-in Rate" value={stats.optInRate} icon={ShieldCheck} trend="up" trendValue="+1.2%" />
              <StatsCard title="Active Subscriptions" value={stats.activeContacts} icon={Users} />
              <StatsCard title="Total Opt-outs" value={stats.totalOptedOut} icon={AlertTriangle} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <Card className="col-span-1 lg:col-span-2 border-accent/20 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-accent">Opt-in vs Opt-out Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorOptins" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorOptouts" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        />
                        <Area type="monotone" dataKey="optins" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorOptins)" />
                        <Area type="monotone" dataKey="optouts" stroke="hsl(var(--destructive))" fillOpacity={1} fill="url(#colorOptouts)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-1 border-accent/20 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-accent">Recent Audit Trail</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[300px] overflow-y-auto">
                    {loading ? (
                      <div className="p-6 text-center text-muted-foreground animate-pulse">Loading logs...</div>
                    ) : history.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground">No recent compliance activity</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-accent hover:bg-accent">
                            <TableHead className="text-accent-foreground">Contact</TableHead>
                            <TableHead className="text-accent-foreground">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {history.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="py-3">
                                <div className="text-sm font-medium text-accent">{log.expand?.contact_id?.phone || 'Unknown'}</div>
                                <div className="text-xs text-muted-foreground">{new Date(log.created).toLocaleDateString()}</div>
                              </TableCell>
                              <TableCell className="py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                                  log.action === 'opted_in' 
                                    ? 'bg-secondary/10 text-secondary border-secondary/20' 
                                    : 'bg-destructive/10 text-destructive border-destructive/20'
                                }`}>
                                  {log.action === 'opted_in' ? 'Subscribed' : 'Unsubscribed'}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default ComplianceDashboard;