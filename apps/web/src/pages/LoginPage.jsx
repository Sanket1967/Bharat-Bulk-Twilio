import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext.jsx';
import ForgotPasswordModal from '@/components/ForgotPasswordModal.jsx';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - Bharat Bulk SMS</title>
        <meta name="description" content="Login to your Bharat Bulk SMS account to manage professional SMS campaigns" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link to="/" className="flex items-center gap-3">
              <img 
                src="https://horizons-cdn.hostinger.com/9fd74963-3c3e-4354-886b-aa61d19d9249/7408ebeb6bc25626b5e2e4f7128dd727.png" 
                alt="Bharat Bulk SMS Logo" 
                className="h-[60px] w-auto object-contain"
              />
            </Link>
          </div>
          
          <Card className="shadow-xl border-accent/20 bg-card">
            <CardHeader className="space-y-1 text-center bg-accent text-accent-foreground rounded-t-xl pb-6">
              <CardTitle className="text-2xl font-bold mt-2">Sign in to Bharat Bulk SMS</CardTitle>
              <CardDescription className="text-accent-foreground/80">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-accent font-semibold">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="text-foreground border-accent/20 focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-accent font-semibold">Password</Label>
                    <button 
                      type="button" 
                      onClick={() => setIsForgotModalOpen(true)}
                      className="text-sm font-medium text-accent hover:text-primary hover:underline transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="text-foreground border-accent/20 focus-visible:ring-primary"
                  />
                </div>

                <Button type="submit" className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Don't have an account? </span>
                <Link to="/signup" className="text-accent hover:text-primary hover:underline font-medium transition-colors">
                  Sign up
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ForgotPasswordModal 
        open={isForgotModalOpen} 
        onOpenChange={setIsForgotModalOpen} 
      />
    </>
  );
};

export default LoginPage;