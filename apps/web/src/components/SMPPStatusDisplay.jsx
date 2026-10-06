import React from 'react';
import { Activity, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const SMPPStatusDisplay = ({ status, lastConnectionTime, lastError, uptime }) => {
  const getStatusColor = (statusText) => {
    switch (statusText) {
      case 'Connected':
        return 'bg-success/10 text-success border-success/20';
      case 'Disconnected':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'Error':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <Card className="border-border shadow-sm mb-6 bg-card overflow-hidden">
      <div className="bg-navy/5 border-b border-border px-6 py-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-navy" />
        <h2 className="text-lg font-semibold text-navy">Connection Status</h2>
      </div>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Current Status</span>
            <div>
              <Badge variant="outline" className={`px-3 py-1 ${getStatusColor(status)}`}>
                {status || 'Unknown'}
              </Badge>
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> Last Connection
            </span>
            <span className="text-foreground font-medium">
              {formatDate(lastConnectionTime)}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Uptime</span>
            <span className="text-foreground font-medium">
              {status === 'Connected' ? formatUptime(uptime) : 'Offline'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" /> Last Error
            </span>
            <span className={`text-sm font-medium ${lastError ? 'text-destructive' : 'text-muted-foreground'}`}>
              {lastError || 'None'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SMPPStatusDisplay;