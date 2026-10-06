import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import CampaignCard from '@/components/CampaignCard.jsx';
import { useCampaigns } from '@/hooks/useCampaigns.js';

const CampaignsPage = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const { campaigns, loading, fetchCampaigns } = useCampaigns();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCampaigns(statusFilter === 'all' ? '' : statusFilter);
  }, [fetchCampaigns, statusFilter]);

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Campaigns - Bharat Bulk SMS</title>
        </Helmet>
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1 py-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-64 bg-muted/50 rounded-xl animate-pulse"></div>
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
        <title>Campaigns - Bharat Bulk SMS</title>
        <meta name="description" content="Manage your Bharat Bulk SMS campaigns" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2 text-accent">Bharat Bulk SMS Campaigns</h1>
                <p className="text-muted-foreground">
                  {campaigns.length} {campaigns.length === 1 ? 'campaign' : 'campaigns'}
                </p>
              </div>
              
              <div className="flex gap-3 w-full sm:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] border-accent/20 focus:ring-primary">
                    <Filter className="h-4 w-4 mr-2 text-accent" />
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                  </SelectContent>
                </Select>

                <Button className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                  <Link to="/campaigns/compose">
                    <Plus className="h-4 w-4 mr-2" />
                    New campaign
                  </Link>
                </Button>
              </div>
            </div>

            {campaigns.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-2xl border border-accent/20 shadow-sm">
                <h3 className="text-xl font-semibold mb-2 text-accent">No campaigns found</h3>
                <p className="text-muted-foreground mb-6">
                  {statusFilter !== 'all' ? 'Try changing the filter' : 'Create your first campaign to get started'}
                </p>
                {statusFilter === 'all' && (
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                    <Link to="/campaigns/compose">
                      <Plus className="h-4 w-4 mr-2" />
                      Create campaign
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default CampaignsPage;