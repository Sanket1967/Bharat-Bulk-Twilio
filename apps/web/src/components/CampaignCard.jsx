import React from 'react';
import { Calendar, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const CampaignCard = ({ campaign, onClick }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-muted text-muted-foreground border-muted-foreground/20';
      case 'scheduled':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'sent':
        return 'bg-accent/10 text-accent border-accent/20';
      default:
        return 'bg-muted text-muted-foreground border-muted-foreground/20';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="bg-card border-accent/20 hover:border-accent/40 hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={onClick}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg text-accent">{campaign.name}</CardTitle>
          <Badge variant="outline" className={getStatusColor(campaign.status)}>
            {campaign.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {campaign.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {campaign.description}
          </p>
        )}
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-foreground/80">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="line-clamp-1">{campaign.message}</span>
          </div>
          
          <div className="flex items-center gap-2 text-foreground/80">
            <Calendar className="h-4 w-4 text-primary" />
            <span>{formatDate(campaign.scheduled_time)}</span>
          </div>
        </div>

        <Button variant="outline" size="sm" className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground">
          View details
        </Button>
      </CardContent>
    </Card>
  );
};

export default CampaignCard;