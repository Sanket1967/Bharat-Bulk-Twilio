import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Users, Server, Activity, MessageSquare, AlertCircle as ActivityIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import StatsCard from '@/components/StatsCard.jsx';
import pb from '@/lib/pocketbaseClient';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    contacts: 0,
    messages: 0,
    recentLogs: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        const [usersRes, contactsRes, sentCampaigns, logsRes] = await Promise.all([
          pb.collection('users').getList(1, 1, { $autoCancel: false }),
          pb.collection('contacts').getList(1, 1, { $autoCancel: false }),
          pb.collection('campaigns').getFullList({ filter: 'status = "sent"', fields: 'id,created,valid_count,invalid_count,failed_count,pending_count,sent_count,completed_count,credits_used', $autoCancel: false }),
          pb.collection('system_logs').getList(1, 8, { sort: '-created', $autoCancel: false })
        ]);

        // Total messages processed = valid + invalid recipients across sent
        // campaigns (aggregate counters on each campaign, no per-recipient rows).
        const messagesProcessed = sentCampaigns.reduce(
          (sum, c) => sum + (c.valid_count || 0) + (c.failed_count || 0),
          0
        );

        setStats({
          users: usersRes.totalItems,
          contacts: contactsRes.totalItems,
          messages: messagesProcessed,
          recentLogs: logsRes.items
        });
      } catch (error) {
        console.error('Failed to fetch admin stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminStats();
  }, []);

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - Bharat Bulk SMS</title>
        <meta name="description" content="Bharat Bulk SMS administrative dashboard and system overview" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <div className="bg-accent text-accent-foreground py-8 mb-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <h1 className="text-3xl font-bold mb-2 tracking-tight">Bharat Bulk SMS Administration</h1>
            <p className="text-accent-foreground/80">Global system overview and health metrics</p>
          </div>
        </div>

        <main className="flex-1 pb-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 -mt-16">
              <StatsCard title="Total Registered Users" value={stats.users} icon={Users} trend="up" trendValue="+12%" />
              <StatsCard title="Total Contacts in DB" value={stats.contacts} icon={Server} />
              <StatsCard title="Total Messages Processed" value={stats.messages} icon={MessageSquare} />
              <StatsCard title="System Health" value="99.9%" icon={ActivityIcon} className="border-secondary/50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-card border-accent/20 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-accent">
                    <Activity className="h-5 w-5 text-primary" />
                    Global System Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {loading ? (
                      <div className="animate-pulse space-y-4">
                        {[1,2,3].map(i => <div key={i} className="h-12 bg-muted/50 rounded-md"></div>)}
                      </div>
                    ) : stats.recentLogs.length === 0 ? (
                      <p className="text-muted-foreground">No recent system activity.</p>
                    ) : (
                      stats.recentLogs.map(log => (
                        <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg border border-accent/10 bg-muted/10">
                          <div className="mt-0.5 p-1.5 bg-primary/10 rounded-full text-primary border border-primary/20">
                            <ActivityIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-accent">{log.action_type}</p>
                            <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.created).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="bg-accent text-accent-foreground border-none shadow-md overflow-hidden">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Quick Admin Actions</h3>
                    <div className="space-y-3">
                      <a href="/admin/users" className="block w-full px-4 py-3 rounded-md bg-accent-foreground/10 hover:bg-accent-foreground/20 border border-accent-foreground/10 transition-colors">
                        <div className="font-medium text-primary-foreground">User Management</div>
                        <div className="text-sm opacity-80 mt-0.5">Add credits, deactivate accounts</div>
                      </a>
                      <a href="/admin/logs" className="block w-full px-4 py-3 rounded-md bg-accent-foreground/10 hover:bg-accent-foreground/20 border border-accent-foreground/10 transition-colors">
                        <div className="font-medium text-primary-foreground">Full Audit Trail</div>
                        <div className="text-sm opacity-80 mt-0.5">Search and filter system logs</div>
                      </a>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default AdminDashboard;