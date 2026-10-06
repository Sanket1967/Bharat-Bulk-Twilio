import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Navigate } from 'react-router-dom';
import { Code2, Terminal, Send, ShieldCheck, KeyRound, Webhook, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ApiDocsLayout from '@/components/ApiDocsLayout.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';

const API_BASE = 'https://app.bharatbulksms.com/api/v1';

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
    id: 'sms-send',
    icon: Send,
    method: 'POST',
    path: '/sms/send',
    title: 'Send SMS',
    desc: 'Send a single SMS via your Twilio sub-account. Credits are deducted by message segment.',
    body: `{
  "to": "+919876543210",
  "from": "+12345678901",
  "message": "Your order has shipped!"
}`,
    samples: {
      curl: `curl -X POST ${API_BASE}/sms/send \\
  -H "x-api-key: bb_live_51H7x8AbCdeFgHiJk" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+919876543210",
    "from": "+12345678901",
    "message": "Your order has shipped!"
  }'`,
      node: `import fetch from 'node-fetch';

const res = await fetch('${API_BASE}/sms/send', {
  method: 'POST',
  headers: {
    'x-api-key': 'bb_live_51H7x8AbCdeFgHiJk',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: '+919876543210',
    from: '+12345678901',
    message: 'Your order has shipped!',
  }),
});
const data = await res.json();
console.log(data);
// { success: true, twilio_sid: 'SM...', status: 'queued', segments: 1, credits_left: 99 }`,
      php: `<?php
$ch = curl_init('${API_BASE}/sms/send');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'x-api-key: bb_live_51H7x8AbCdeFgHiJk',
    'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'to' => '+919876543210',
    'from' => '+12345678901',
    'message' => 'Your order has shipped!',
]));
$response = curl_exec($ch);
curl_close($ch);
echo $response;`,
      python: `import requests

resp = requests.post(
    '${API_BASE}/sms/send',
    headers={
        'x-api-key': 'bb_live_51H7x8AbCdeFgHiJk',
        'Content-Type': 'application/json',
    },
    json={
        'to': '+919876543210',
        'from': '+12345678901',
        'message': 'Your order has shipped!',
    },
)
print(resp.json())`,
    },
  },
  {
    id: 'otp-send',
    icon: ShieldCheck,
    method: 'POST',
    path: '/otp/send',
    title: 'Send OTP',
    desc: 'Generate and send a 6-digit OTP. Returns a request_id used for verification.',
    body: `{
  "to": "+919876543210",
  "from": "+12345678901",
  "template": "Your OTP is {{otp}}"
}`,
    samples: {
      curl: `curl -X POST ${API_BASE}/otp/send \\
  -H "x-api-key: bb_live_51H7x8AbCdeFgHiJk" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+919876543210",
    "from": "+12345678901",
    "template": "Your OTP is {{otp}}"
  }'`,
      node: `const res = await fetch('${API_BASE}/otp/send', {
  method: 'POST',
  headers: {
    'x-api-key': 'bb_live_51H7x8AbCdeFgHiJk',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: '+919876543210',
    from: '+12345678901',
    template: 'Your OTP is {{otp}}',
  }),
});
const data = await res.json();
console.log(data);
// { request_id: 'otp_...', to: '+919876543210', status: 'sent', credits_left: 98 }`,
      php: `<?php
$ch = curl_init('${API_BASE}/otp/send');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'x-api-key: bb_live_51H7x8AbCdeFgHiJk',
    'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'to' => '+919876543210',
    'from' => '+12345678901',
    'template' => 'Your OTP is {{otp}}',
]));
echo curl_exec($ch);`,
      python: `import requests

resp = requests.post(
    '${API_BASE}/otp/send',
    headers={
        'x-api-key': 'bb_live_51H7x8AbCdeFgHiJk',
        'Content-Type': 'application/json',
    },
    json={
        'to': '+919876543210',
        'from' => '+12345678901',
        'template': 'Your OTP is {{otp}}',
    },
)
print(resp.json())`,
    },
  },
  {
    id: 'otp-verify',
    icon: ShieldCheck,
    method: 'POST',
    path: '/otp/verify',
    title: 'Verify OTP',
    desc: 'Verify a previously sent OTP using the request_id. OTPs expire after 5 minutes.',
    body: `{
  "request_id": "otp_abc123...",
  "otp": "123456"
}`,
    samples: {
      curl: `curl -X POST ${API_BASE}/otp/verify \\
  -H "x-api-key: bb_live_51H7x8AbCdeFgHiJk" \\
  -H "Content-Type: application/json" \\
  -d '{
    "request_id": "otp_abc123...",
    "otp": "123456"
  }'`,
      node: `const res = await fetch('${API_BASE}/otp/verify', {
  method: 'POST',
  headers: {
    'x-api-key': 'bb_live_51H7x8AbCdeFgHiJk',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    request_id: 'otp_abc123...',
    otp: '123456',
  }),
});
const data = await res.json();
console.log(data);
// { success: true, verified: true }`,
      php: `<?php
$ch = curl_init('${API_BASE}/otp/verify');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'x-api-key: bb_live_51H7x8AbCdeFgHiJk',
    'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'request_id' => 'otp_abc123...',
    'otp' => '123456',
]));
echo curl_exec($ch);`,
      python: `import requests

resp = requests.post(
    '${API_BASE}/otp/verify',
    headers={
        'x-api-key': 'bb_live_51H7x8AbCdeFgHiJk',
        'Content-Type': 'application/json',
    },
    json={
        'request_id': 'otp_abc123...',
        'otp': '123456',
    },
)
print(resp.json())`,
    },
  },
  {
    id: 'reports-get',
    icon: ClipboardList,
    method: 'GET',
    path: '/reports/:request_id',
    title: 'Get Delivery Report',
    desc: 'Fetch exact sent / delivered / failed timestamps and the end-to-end delivery duration for a single API send, using the request_id returned by /sms/send or /otp/send.',
    body: `// No request body.
// Replace :request_id with the id returned by the send endpoint.
//
// Example:
//   GET /reports/sms_a1b2c3d4e5f6...`,
    samples: {
      curl: `curl -X GET ${API_BASE}/reports/sms_a1b2c3d4e5f6 \\
  -H "x-api-key: bb_live_51H7x8AbCdeFgHiJk"`,
      node: `const res = await fetch('${API_BASE}/reports/sms_a1b2c3d4e5f6', {
  method: 'GET',
  headers: {
    'x-api-key': 'bb_live_51H7x8AbCdeFgHiJk',
  },
});
const data = await res.json();
console.log(data);
// {
//   "request_id": "sms_a1b2c3d4e5f6",
//   "to": "+919876543210",
//   "sent_at": "2025-10-05T08:45:30.123Z",
//   "delivered_at": "2025-10-05T08:45:34.543Z",
//   "duration_seconds": 4,
//   "status": "delivered"
// }`,
      php: `<?php
$ch = curl_init('${API_BASE}/reports/sms_a1b2c3d4e5f6');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'x-api-key: bb_live_51H7x8AbCdeFgHiJk',
]);
echo curl_exec($ch);`,
      python: `import requests

resp = requests.get(
    '${API_BASE}/reports/sms_a1b2c3d4e5f6',
    headers={
        'x-api-key': 'bb_live_51H7x8AbCdeFgHiJk',
    },
)
print(resp.json())`,
    },
  },
];

export default function InternationalApiDocsPage() {
  const { isAuthenticated, canUseInternational, canUseDomestic } = useAuth();
  const [activeEndpoint, setActiveEndpoint] = useState(endpoints[0].id);
  // Logged-in users without international access are redirected to the
  // domestic docs (or dashboard) — the tab is hidden, not just disabled.
  if (isAuthenticated && !canUseInternational) {
    if (canUseDomestic) return <Navigate to="/api-docs/domestic" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  const current = endpoints.find((e) => e.id === activeEndpoint);

  return (
    <ApiDocsLayout>
      <Helmet>
        <title>International SMS API Documentation — Bharat Bulk SMS</title>
        <meta name="description" content="REST API documentation for the Bharat Bulk SMS International (Twilio) API: send SMS, send OTP, and verify OTP." />
      </Helmet>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">International SMS</span>
          </div>
          <h2 className="text-2xl font-bold text-navy">Twilio-based REST API</h2>
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
            Send SMS and OTPs programmatically to international destinations
            via your Twilio sub-account. Authenticate every request with your
            API key in the{' '}
            <code className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">x-api-key</code> header.
            Base URL: <code className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">{API_BASE}</code>
          </p>
        </div>

        {/* Quick facts */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <Card className="border-border">
            <CardContent className="p-5 flex items-start gap-3">
              <KeyRound className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold text-navy text-sm">Authentication</p>
                <p className="text-xs text-muted-foreground mt-1">Pass your API key in the <code className="font-mono">x-api-key</code> header.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5 flex items-start gap-3">
              <Send className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold text-navy text-sm">Sending hours</p>
                <p className="text-xs text-muted-foreground mt-1">International sends have no time-window restriction.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5 flex items-start gap-3">
              <Webhook className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold text-navy text-sm">Webhooks</p>
                <p className="text-xs text-muted-foreground mt-1">Set a webhook URL in API Keys to receive delivery updates.</p>
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
                <CodeBlock>{current.id === 'sms-send'
                  ? `{
  "success": true,
  "request_id": "sms_...",
  "twilio_sid": "SM...",
  "status": "queued",
  "segments": 1,
  "credits_left": 99
}`
                  : current.id === 'otp-send'
                  ? `{
  "request_id": "otp_...",
  "to": "+919876543210",
  "status": "sent",
  "credits_left": 98
}`
                  : current.id === 'reports-get'
                  ? `{
  "request_id": "sms_a1b2c3d4e5f6",
  "to": "+919876543210",
  "sent_at": "2025-10-05T08:45:30.123Z",
  "delivered_at": "2025-10-05T08:45:34.543Z",
  "duration_seconds": 4,
  "status": "delivered"
}`
                  : `{
  "success": true,
  "verified": true
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

        {/* Segment / credit notes */}
        <Card className="border-border mt-8">
          <CardHeader>
            <CardTitle className="text-navy">Credits & Segments</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• GSM-7 messages: 160 chars per segment (153 when concatenated).</p>
            <p>• Unicode messages: 70 chars per segment (67 when concatenated).</p>
            <p>• One credit is deducted per segment. Sends are rejected if credits are insufficient.</p>
            <p>• OTP messages count as 1 segment by default.</p>
          </CardContent>
        </Card>
    </ApiDocsLayout>
  );
}
