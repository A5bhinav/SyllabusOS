'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (authError) {
        throw authError;
      }

      if (!data.user) {
        throw new Error('Login failed - no user data returned');
      }

      // Get user profile to determine role
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      // If profile doesn't exist, create it (fallback)
      if (profileError || !profile) {
        try {
          const response = await fetch('/api/auth/create-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              email: data.user.email!,
              name: data.user.user_metadata?.name || '',
              role: data.user.user_metadata?.role || 'student',
            }),
          });

          if (response.ok) {
            // Wait a moment for profile to be available
            await new Promise(resolve => setTimeout(resolve, 500));
            // Retry fetching profile
            const retryResult = await supabase
              .from('profiles')
              .select('role')
              .eq('id', data.user.id)
              .maybeSingle();
            profile = retryResult.data;
          }
        } catch (err) {
          console.error('Failed to create profile:', err);
        }
      }

      // Redirect to home page - it will handle routing based on role
      // This ensures consistent redirect logic and checks for courses
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Failed to log in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <Card className="w-full max-w-md shadow-xl border-2">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <svg
              className="w-7 h-7 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <CardTitle className="text-3xl font-bold">Welcome back</CardTitle>
          <CardDescription className="text-base">
            Sign in to your ProfAI account
        </CardDescription>
      </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address
              </Label>
            <Input
              id="email"
              type="email"
                placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
                className="h-11"
            />
          </div>
          <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
            <Input
              id="password"
              type="password"
                placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
                className="h-11"
            />
          </div>
          {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-start gap-2">
                <svg
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{error}</span>
            </div>
          )}
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-medium shadow-sm hover:shadow-md transition-shadow" 
              disabled={loading}
            >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                  Signing in...
              </>
            ) : (
                'Sign in'
            )}
          </Button>
        </form>
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">New here?</span>
            </div>
          </div>
          <div className="text-center">
            <Link 
              href="/signup" 
              className="text-sm font-medium text-primary hover:underline"
            >
              Create an account →
          </Link>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
