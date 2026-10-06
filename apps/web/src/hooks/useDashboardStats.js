import { useState, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';

export const useDashboardStats = () => {
  const [stats, setStats] = useState({
    totalContacts: 0,
    activeCampaigns: 0,
    messagesSent: 0,
    recentCampaigns: []
  });
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [contacts, campaigns] = await Promise.all([
        pb.collection('contacts').getFullList({ $autoCancel: false }),
        pb.collection('campaigns').getFullList({
          // Exclude the per-recipient JSON blob — dashboard only needs counters.
          fields: 'id,created,updated,name,status,total_recipients,valid_count,invalid_count,sms_parts,credits_used,pending_count,sent_count,completed_count,failed_count',
          $autoCancel: false,
        })
      ]);

      const activeCampaigns = campaigns.filter(c => c.status === 'scheduled' || c.status === 'draft');
      const sentCampaigns = campaigns.filter(c => c.status === 'sent');
      const recentCampaigns = campaigns.slice(0, 5);

      // Messages sent = sum of valid recipients across sent campaigns.
      // Aggregate counters live on each campaign, so this scales to 50k+ without
      // loading per-recipient rows.
      const messagesSent = sentCampaigns.reduce(
        (sum, c) => sum + (c.valid_count || 0),
        0
      );

      setStats({
        totalContacts: contacts.length,
        activeCampaigns: activeCampaigns.length,
        messagesSent,
        recentCampaigns
      });

      const statusCounts = {
        sent: sentCampaigns.reduce((s, c) => s + (c.sent_count || 0), 0),
        pending: sentCampaigns.reduce((s, c) => s + (c.pending_count || 0), 0),
        failed: sentCampaigns.reduce((s, c) => s + (c.failed_count || 0), 0),
        delivered: sentCampaigns.reduce((s, c) => s + (c.completed_count || 0), 0)
      };

      setPerformanceData([
        { name: 'Sent', value: statusCounts.sent, fill: 'hsl(var(--primary))' },
        { name: 'Delivered', value: statusCounts.delivered, fill: 'hsl(var(--accent))' },
        { name: 'Pending', value: statusCounts.pending, fill: 'hsl(var(--secondary))' },
        { name: 'Failed', value: statusCounts.failed, fill: 'hsl(var(--destructive))' }
      ]);
    } catch (error) {
      toast.error('Failed to load dashboard stats');
      console.error('Fetch stats error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    stats,
    performanceData,
    loading,
    fetchStats
  };
};
