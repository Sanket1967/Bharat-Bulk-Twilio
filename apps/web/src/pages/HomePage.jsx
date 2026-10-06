import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, MessageSquare, Users, Zap, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const HomePage = () => {
  const features = [
    {
      icon: MessageSquare,
      title: 'Bulk SMS campaigns',
      description: 'Send personalized messages to thousands of contacts across India with a single click using Bharat Bulk SMS.'
    },
    {
      icon: Users,
      title: 'Contact management',
      description: 'Organize contacts into lists, import from CSV, and manage tags efficiently within the Bharat Bulk SMS platform.'
    },
    {
      icon: Zap,
      title: 'Smart scheduling',
      description: 'Schedule campaigns for optimal delivery times and automate your workflow with our intelligent routing.'
    },
    {
      icon: BarChart3,
      title: 'Real-time analytics',
      description: 'Track delivery status, engagement metrics, and campaign performance with Bharat Bulk SMS analytics.'
    }
  ];

  return (
    <>
      <Helmet>
        <title>Bharat Bulk SMS - Professional Bulk SMS Platform</title>
        <meta name="description" content="Send bulk SMS campaigns, manage contacts, and track performance with Bharat Bulk SMS, the premier professional platform." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          <section className="py-20 md:py-32 bg-accent text-accent-foreground relative overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 text-primary-foreground text-sm font-medium mb-6 border border-primary/30">
                    <img 
                      src="https://horizons-cdn.hostinger.com/9fd74963-3c3e-4354-886b-aa61d19d9249/7408ebeb6bc25626b5e2e4f7128dd727.png" 
                      alt="Bharat Bulk SMS Logo" 
                      className="h-5 w-auto object-contain brightness-0 invert"
                    />
                    Welcome to Bharat Bulk SMS
                  </div>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-balance" style={{letterSpacing: '-0.02em'}}>
                    Professional Bulk SMS Platform
                  </h1>
                  <p className="text-lg md:text-xl text-accent-foreground/80 mb-8 leading-relaxed">
                    Manage contacts, compose messages, and track delivery status all in one professional platform built for modern businesses.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                      <Link to="/signup">
                        Get Started with Bharat Bulk SMS
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="border-accent-foreground/20 text-accent-foreground hover:bg-accent-foreground hover:text-accent" asChild>
                      <Link to="/login">Login to Dashboard</Link>
                    </Button>
                  </div>
                </div>
                <div className="relative lg:h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-accent-foreground/10 bg-white flex items-center justify-center p-12">
                  <img 
                    src="https://horizons-cdn.hostinger.com/9fd74963-3c3e-4354-886b-aa61d19d9249/7408ebeb6bc25626b5e2e4f7128dd727.png" 
                    alt="Bharat Bulk SMS Logo" 
                    className="w-full max-w-md h-auto object-contain drop-shadow-xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent mix-blend-overlay pointer-events-none"></div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-24 bg-background">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-accent">Everything you need to succeed</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Powerful features designed to help you reach your audience effectively with Bharat Bulk SMS.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="bg-card rounded-2xl p-8 shadow-sm border border-accent/10 hover:border-primary/30 hover:shadow-md transition-all duration-200"
                  >
                    <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4 border border-primary/20">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-accent">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-24 bg-accent text-accent-foreground border-t border-accent-foreground/10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Ready to transform your messaging?
                </h2>
                <p className="text-lg mb-8 opacity-90">
                  Join businesses using Bharat Bulk SMS to connect with their customers reliably and securely.
                </p>
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                  <Link to="/signup">
                    Get Started with Bharat Bulk SMS
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default HomePage;