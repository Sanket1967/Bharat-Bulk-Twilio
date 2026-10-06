import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, User, Shield, Settings, FileText, Server, KeyRound, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext.jsx';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, logout, isAuthenticated, isAdmin, impersonating, exitImpersonation, adminBackupMeta, canUseInternational, canUseDomestic, isApiEnabled } = useAuth();
  const location = useLocation();

  // Admins have unlimited International SMS credits (server-side bypass), so
  // mirror the domestic credit balance for the Intl display instead of
  // showing 0. Regular users show their actual separate sms_credits.
  const intlCredits = isAdmin ? (currentUser?.credits || 0) : (currentUser?.sms_credits || 0);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const navLinks = isAuthenticated ? [
    { path: '/dashboard', label: 'Dashboard' },
    // Domestic (SIM Base / SMPP) — India, 10AM–6PM
    ...(canUseDomestic ? [
      { path: '/campaigns', label: 'Campaigns' },
      { path: '/contacts', label: 'Contacts' },
      { path: '/delivery-logs', label: 'Delivery Logs' },
      { path: '/manage-senderid', label: 'SenderID', icon: Settings },
      { path: '/manage-template', label: 'Template', icon: FileText },
      { path: '/compliance', label: 'Compliance' },
    ] : []),
    // International (Twilio) — 24/7, worldwide
    ...(canUseInternational ? [
      { path: '/twilio-campaign', label: 'International SMS' },
      { path: '/reports', label: 'SMS Reports' },
    ] : []),
    // API access (gated separately)
    ...(isApiEnabled ? [
      { path: '/api-keys', label: 'API Keys', icon: KeyRound },
      { path: '/api-docs', label: 'API Docs', icon: Code2 },
    ] : []),
  ] : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {impersonating && (
        <div className="bg-amber-500 text-amber-950 text-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className="font-medium">
              Viewing as <span className="font-bold">{currentUser?.name || currentUser?.email}</span>
              {adminBackupMeta?.email ? (
                <span className="opacity-80"> · Admin: {adminBackupMeta.email}</span>
              ) : null}
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={exitImpersonation}
              className="bg-amber-950 text-amber-50 hover:bg-amber-900 shrink-0"
            >
              Return to Admin
            </Button>
          </div>
        </div>
      )}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-full">
        <div className="flex h-20 items-center gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link to="/" className="flex items-center gap-3 shrink-0">
              <img 
                src="https://horizons-cdn.hostinger.com/9fd74963-3c3e-4354-886b-aa61d19d9249/7408ebeb6bc25626b5e2e4f7128dd727.png" 
                alt="Bharat Bulk SMS Logo" 
                className="h-[40px] md:h-[50px] w-auto object-contain"
              />
            </Link>

            <nav className="hidden xl:flex items-center gap-3 lg:gap-4 min-w-0 flex-1 overflow-x-auto overscroll-x-contain py-1 [scrollbar-width:thin]">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                    isActive(link.path) ? 'text-primary' : 'text-navy'
                  }`}
                >
                  {link.icon && <link.icon className="h-4 w-4" />}
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className={`hidden xl:inline-flex text-sm font-semibold items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors shrink-0 ${
                    isActive('/admin')
                      ? 'bg-navy text-navy-foreground hover:bg-navy/90 hover:text-navy-foreground'
                      : 'text-navy hover:bg-navy hover:text-navy-foreground'
                  }`}>
                    <Shield className="h-4 w-4" />
                    Admin
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="w-full cursor-pointer">Admin Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/users" className="w-full cursor-pointer">User Management</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/smpp-settings" className="w-full cursor-pointer flex items-center gap-2">
                      <Server className="h-4 w-4" /> SMPP Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-3 text-sm">
                  {canUseDomestic && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Dom:</span>
                      <span className="font-bold text-primary">{intlCredits}</span>
                    </div>
                  )}
                  {canUseInternational && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Intl:</span>
                      <span className="font-bold text-primary">{intlCredits}</span>
                    </div>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-xl overflow-hidden border border-navy/20 bg-navy/5 hover:bg-navy/10 text-navy">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2.5 bg-navy text-navy-foreground rounded-t-sm">
                      <p className="text-sm font-semibold truncate">{currentUser?.name || 'User'}</p>
                      <p className="text-xs opacity-90 truncate">{currentUser?.email}</p>
                      {isAdmin && (
                        <span className="mt-2 inline-flex items-center rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                          Administrator
                        </span>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/contacts/lists" className="w-full cursor-pointer hover:text-primary">Manage Lists</Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin/users" className="w-full cursor-pointer hover:text-primary">User Management</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" className="text-navy hover:text-primary hover:bg-primary/10" asChild>
                  <Link to="/api-docs">API Docs</Link>
                </Button>
                <Button variant="ghost" className="text-navy hover:text-primary hover:bg-primary/10" asChild>
                  <Link to="/login">Login</Link>
                </Button>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                  <Link to="/signup">Sign up</Link>
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="xl:hidden text-navy shrink-0"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="xl:hidden py-4 border-t">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-sm font-medium transition-colors flex items-center gap-2 ${
                    isActive(link.path) ? 'text-primary' : 'text-navy'
                  }`}
                >
                  {link.icon && <link.icon className="h-4 w-4" />}
                  {link.label}
                </Link>
              ))}
              {isAdmin && (
                <div className="pt-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><Shield className="h-3 w-3" /> Admin Options</p>
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-medium text-navy flex items-center gap-2 py-1"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/admin/users"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-medium text-navy flex items-center gap-2 py-1"
                  >
                    User Management
                  </Link>
                  <Link
                    to="/admin/smpp-settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-medium text-navy flex items-center gap-2 py-1"
                  >
                    <Server className="h-4 w-4" /> SMPP Settings
                  </Link>
                </div>
              )}
              {isAuthenticated && (
                <div className="pt-4 mt-2 border-t flex flex-col gap-1">
                  {canUseDomestic && (
                    <span className="text-sm font-medium text-navy">Dom Credits: <span className="text-primary font-bold">{currentUser?.credits || 0}</span></span>
                  )}
                  {canUseInternational && (
                    <span className="text-sm font-medium text-navy">Intl Credits: <span className="text-primary font-bold">{intlCredits}</span></span>
                  )}
                  <Button variant="ghost" size="sm" className="text-destructive mt-2" onClick={() => { logout(); setMobileMenuOpen(false); }}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              )}
              {!isAuthenticated && (
                <div className="pt-4 border-t flex flex-col gap-2">
                  <Button variant="outline" asChild className="w-full justify-center border-navy text-navy hover:bg-navy hover:text-navy-foreground">
                    <Link to="/api-docs" onClick={() => setMobileMenuOpen(false)}>API Docs</Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full justify-center border-navy text-navy hover:bg-navy hover:text-navy-foreground">
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                  </Button>
                  <Button asChild className="w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>Sign up</Link>
                  </Button>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;