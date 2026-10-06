import React, { useState } from 'react';
import { Plug, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const SMPPConnectionTest = ({ formData, onTest }) => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null); // { success: boolean, message: string }

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const res = await onTest(formData);
      setResult({ success: true, message: res.message });
      toast.success('Connection test successful!');
    } catch (error) {
      setResult({ success: false, message: error.message || 'Connection failed.' });
      toast.error('Connection test failed.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <Button 
        type="button" 
        variant="outline" 
        onClick={handleTest} 
        disabled={testing}
        className="border-navy text-navy hover:bg-navy/5"
      >
        {testing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Testing Connection...
          </>
        ) : (
          <>
            <Plug className="h-4 w-4 mr-2" />
            Test Connection
          </>
        )}
      </Button>

      {result && (
        <div className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md ${
          result.success ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
        }`}>
          {result.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <span>{result.message}</span>
          {!result.success && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-0 px-2 ml-2 text-destructive hover:bg-transparent hover:text-destructive/80 hover:underline"
              onClick={handleTest}
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default SMPPConnectionTest;