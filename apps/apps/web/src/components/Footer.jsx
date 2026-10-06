import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-accent text-accent-foreground mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <img 
                src="https://horizons-cdn.hostinger.com/9fd74963-3c3e-4354-886b-aa61d19d9249/7408ebeb6bc25626b5e2e4f7128dd727.png" 
                alt="Bharat Bulk SMS Logo" 
                className="h-[50px] w-auto object-contain brightness-0 invert"
              />
            </div>
            <p className="text-sm text-accent-foreground/80 max-w-sm leading-relaxed">
              The premier professional bulk SMS platform for businesses across India. 
              Deliver high-impact campaigns, manage contacts securely, and track performance in real-time.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4 text-lg">Quick Links</h3>
            <ul className="space-y-3 text-sm text-accent-foreground/80">
              <li><Link to="/login" className="hover:text-primary transition-colors">Login</Link></li>
              <li><Link to="/signup" className="hover:text-primary transition-colors">Sign Up</Link></li>
              <li><Link to="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-lg">Legal</h3>
            <ul className="space-y-3 text-sm text-accent-foreground/80">
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link to="/compliance" className="hover:text-primary transition-colors">Compliance</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-accent-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-accent-foreground/60">
            © {new Date().getFullYear()} Bharat Bulk SMS. All rights reserved.
          </p>
          <div className="text-sm text-accent-foreground/60">
            Contact: support@bharatbulksms.com
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;