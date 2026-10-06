import React from 'react';
import { AlertTriangle } from 'lucide-react';

const AlertBanner = ({ message }) => {
  return (
    <div className="bg-primary/10 border border-primary/30 text-primary rounded-lg p-4 flex items-start gap-3 mb-8">
      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
      <div>
        <p className="font-medium text-sm md:text-base">{message}</p>
      </div>
    </div>
  );
};

export default AlertBanner;