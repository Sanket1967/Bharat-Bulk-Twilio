import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const StatsCard = ({ title, value, icon: Icon, trend, trendValue, className = '' }) => {
  const isPositive = trend === 'up';

  return (
    <Card className={`bg-card border-accent/20 hover:border-accent/40 hover:shadow-lg transition-all duration-200 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-accent">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {trendValue && (
              <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-secondary' : 'text-destructive'}`}>
                {isPositive ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                <span className="font-medium">{trendValue}</span>
              </div>
            )}
          </div>
          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;