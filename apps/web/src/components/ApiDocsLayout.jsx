import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Code2, Globe, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';

// Shared chrome for the two API documentation pages. Renders the page
// heading and a tab-style navigation between the International and Domestic
// API docs so visitors can switch contexts without losing their place.
export default function ApiDocsLayout({ children }) {
  const location = useLocation();
  const { isAuthenticated, canUseInternational, canUseDomestic } = useAuth();

  const allTabs = [
    {
      to: '/api-docs/international',
      label: 'International SMS API',
      desc: 'Twilio-based REST API · x-api-key auth',
      icon: Globe,
      service: 'international',
    },
    {
      to: '/api-docs/domestic',
      label: 'Domestic SMS API',
      desc: 'SIM Base / SMPP campaign API · JWT auth',
      icon: Phone,
      service: 'domestic',
    },
  ];

  // Logged-in users only see the API sections their flags allow. Logged-out
  // visitors see both for marketing.
  const tabs = isAuthenticated
    ? allTabs.filter((t) =>
        t.service === 'international' ? canUseInternational : canUseDomestic,
      )
    : allTabs;

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-5xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Code2 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-navy">API Documentation</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Bharat Bulk SMS exposes two distinct APIs. Choose the one that
            matches your sending route — International (Twilio) or Domestic
            (SIM Base / SMPP). Authentication and sending rules differ between
            them.
          </p>
        </div>

        {/* Tab navigation between the two APIs */}
        <div className="grid sm:grid-cols-2 gap-3 mb-10">
          {tabs.map((t) => {
            const active = isActive(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex items-center gap-3 rounded-xl border p-4 transition-colors ${
                  active
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5'
                }`}
              >
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-navy'
                  }`}
                >
                  <t.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className={`font-semibold ${active ? 'text-primary' : 'text-navy'}`}>
                    {t.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </div>
  );
}
