import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Navigate } from 'react-router-dom';
import { Terminal, Send, Activity, KeyRound, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ApiDocsLayout from '@/components/ApiDocsLayout.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';

// Domestic SMS API uses the SIM Base / SMPP route. Unlike the International
// (Twilio) API, it is authenticated with the user's PocketBase JWT (Bearer
// token) — NOT an x-api-key.
const API_BASE = 'https://app.bharatbulksms.com/api/v1/domestic';

function CodeBlock({ children }) {
  return (
    <pre className="bg-[hsl(214_47%_11%)] text-[hsl(210_40%_98%)] rounded-lg p-4 overflow-x-auto text-sm font-mono leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function EndpointHeader({ method, path, title, desc }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-primary text-primary-foreground">{method}</span>
        <code className="text-navy font-mono text-sm font-semibold">{path}</code>
      </div>
      <h3 className="text-lg font-semibold text-navy mt-2">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}

const endpoints = [
  {
    id: 'send-campaign',
    icon: Send,
    method: 'POST',
    path: '/sms/send-campaign',
    title: 'Send Campaign',
    desc: 'Queue a domestic SMS campaign for delivery over the SIM Base (SMPP) route. Recipients are read from the campaign record.',
    body: `{
  "campaignId": "RECORD_ID_OF_THE_CAMPAIGN",
  "route": "SIM"
}`,
    samples: {
      curl: `curl -X POST ${API_BASE}/sms/send-campaign \\
  -H "Authorization: Bearer YOUR_POCKETBASE_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{
    "campaignId": "RECORD_ID_OF_THE_CAMPAIGN",
    "route": "SIM"
  }'`,
      node: `import fetch from 'node-fetch';

const res = await fetch('${API_BASE}/sms/send-campaign', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer YOUR_POCKETBASE_JWT',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    campaignId: 'RECORD_ID_OF_THE_CAMPAIGN',
    route: 'SIM',
  }),
});
const data = await res.json();
console.log(data);
// { ok: true, queued: 5000, skipped: 0, queueLength: 5000 }`,
      php: `<?php
$ch = curl_init('${API_BASE}/sms/send-campaign');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer YOUR_POCKETBASE_JWT',
    'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'campaignId' => 'RECORD_ID_OF_THE_CAMPAIGN',
    'route' => 'SIM',
]));
echo curl_exec($ch);`,
      python: `import requests

resp = requests.post(
    '${API_BASE}/sms/send-campaign',
    headers={
        'Authorization': 'Bearer YOUR_POCKETBASE_JWT',
        'Content-Type': 'application/json',
    },
    json={
        'campaignId': 'RECORD_ID_OF_THE_CAMPAIGN',
        'route': 'SIM',
    },
)
print(resp.json())`,
    },
  },
  {
    id: 'smpp-status',
    icon: Activity,
    method: 'GET',
    path: '/sms/smpp-status',
    title: 'SMPP Connection Status',
    desc: 'Returns the current state of the SMPP transceiver used for domestic delivery. No request body required.',
    body: `// No request body — GET endpoint`,
    samples: {
      curl: `curl ${API_BASE}/sms/smpp-status \\
  -H "Authorization: Bearer YOUR_POCKETBASE_JWT"`,
      node: `import fetch from 'node-fetch';

const res = await fetch('${API_BASE}/sms/smpp-status', {
  headers: { Authorization: 'Bearer YOUR_POCKETBASE_JWT' },
});
const data = await res.json();
console.log(data);
// { state: 'BOUND', connected: true, uptimeSeconds: 3600, configured: true, tps: 50 }`,
      php: `<?php
$ch = curl_init('${API_BASE}/sms/smpp-status');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer YOUR_POCKETBASE_JWT',
]);
echo curl_exec($ch);`,
      python: `import requests

resp = requests.get(
    '${API_BASE}/sms/smpp-status',
    headers={'Authorization': 'Bearer YOUR_POCKETBASE_JWT'},
)
print(resp.json())`,
    },
  },
];

export default function DomesticApiDocsPage() {
  const { isAuthenticated, canUseInternational, canUseDomestic } = useAuth();
  const [activeEndpoint, setActiveEndpoint] = useState(endpoints[0].id);
  // Logged-in users without domestic access are redirected to the
  // international docs (or dashboard).
  if (isAuthenticated && !canUseDomestic) {
    if (canUseInternational) return <Navigate to="/api-docs/international" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  const current = endpoints.find((e) => e.id === activeEndpoint);

  return (
    <ApiDocsLayout>
      <Helmet>
        <title>Domestic SMS API Documentation — Bharat Bulk SMS</title>
        <meta name="description" content="REST API documentation for the Bharat Bulk SMS Domestic (SIM Base / SMPP) API: send campaigns and check SMPP status." />
      </Helmet>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Domestic SMS</span>
          </div>
          <h2 className="text-2xl font-bold text-navy">SIM Base / SMPP API</h2>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Base URL for International / OTP</p>
              <code className="font-mono text-sm text-navy break-all">https://app.bharatbulksms.com/api/v1</code>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Base URL for Domestic</p>
              <code className="font-mono text-sm text-navy break-all">https://app.bharatbulksms.com/api/v1/domestic</code>
            </div>
          </div>
          <p className="text-muted-foreground max-w-2xl mt-4">
            Dispatch domestic SMS campaigns over the SIM Base (SMPP) route.
            Authenticate every request with your PocketBase session token in
            the{' '}
            <code className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">Authorization: Bearer</code>{' '}
            header. Base URL:{' '}
            <code className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">{API_BASE}</code>
          </p>
        </div>

        {/* Quick facts */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <Card className="border-border">
            <CardContent className="p-5 flex items-start gap-3">
              <KeyRound className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold text-navy text-sm">Authentication</p>
                <p className="text-xs text-muted-foreground mt-1">Pass your PocketBase JWT as <code className="font-mono">Authorization: Bearer</code>.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold text-navy text-sm">Ownership</p>
                <p className="text-xs text-muted-foreground mt-1">Only the campaign's creator (or an admin) may dispatch it.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Endpoint selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {endpoints.map((e) => (
            <button
              key={e.id}
              onClick={() => setActiveEndpoint(e.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeEndpoint === e.id
                  ? 'bg-navy text-navy-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              <e.icon className="h-4 w-4" />
              {e.title}
            </button>
          ))}
        </div>

        <Card className="border-border">
          <CardHeader>
            <EndpointHeader method={current.method} path={current.path} title={current.title} desc={current.desc} />
          </CardHeader>
          <CardContent>
            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Request body</p>
                <CodeBlock>{current.body}</CodeBlock>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Response</p>
                <CodeBlock>{current.id === 'send-campaign'
                  ? `{
  "ok": true,
  "queued": 5000,
  "skipped": 0,
  "queueLength": 5000
}`
                  : `{
  "state": "BOUND",
  "connected": true,
  "uptimeSeconds": 3600,
  "configured": true,
  "tps": 50
}`}</CodeBlock>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5" /> Code examples
              </p>
              <Tabs defaultValue="curl">
                <TabsList className="grid grid-cols-4 w-full max-w-md mb-4">
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                  <TabsTrigger value="node">Node.js</TabsTrigger>
                  <TabsTrigger value="php">PHP</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                </TabsList>
                <TabsContent value="curl"><CodeBlock>{current.samples.curl}</CodeBlock></TabsContent>
                <TabsContent value="node"><CodeBlock>{current.samples.node}</CodeBlock></TabsContent>
                <TabsContent value="php"><CodeBlock>{current.samples.php}</CodeBlock></TabsContent>
                <TabsContent value="python"><CodeBlock>{current.samples.python}</CodeBlock></TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Domestic sending rules */}
        <Card className="border-border mt-8">
          <CardHeader>
            <CardTitle className="text-navy">Domestic Sending Rules</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Recipients are read from the campaign record — create the campaign (and upload recipients) first, then dispatch by <code className="font-mono">campaignId</code>.</p>
            <p>• A per-user delivery-percentage cap may reduce the number actually sent; skipped recipients are recorded in the campaign report.</p>
            <p>• Only the campaign's creator or an admin can dispatch a campaign. Invalid numbers are not billed.</p>
            <p>• Delivery reports and per-recipient status are available in the Delivery Logs and campaign detail views.</p>
          </CardContent>
        </Card>
    </ApiDocsLayout>
  );
}
