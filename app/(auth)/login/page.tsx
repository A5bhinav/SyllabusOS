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

      // Get user profile to determine role
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        // If profile doesn't exist, create it (fallback)
        if (profileError || !profile) {
          console.warn('Profile not found, attempting to create...');
          try {
            const response = await fetch('/api/auth/create-profile', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: data.user.id,
                email: data.user.email!,
                name: data.user.user_metadata?.name || '',
                role: data.user.user_metadata?.role || 'student',
              }),
            });

            if (response.ok) {
              // Re-fetch profile
              const { data: newProfile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();

              if (newProfile?.role === 'professor') {
                window.location.href = '/dashboard';
                return;
              } else {
                window.location.href = '/student';
                return;
              }
            }
          } catch (err) {
            console.error('Failed to create profile:', err);
          }
          
          // Default to student dashboard if profile creation fails
          window.location.href = '/student';
          return;
        }

        // Redirect based on role from database
        // Check if professor has courses - if not, go to onboarding
        if (profile.role === 'professor') {
          // Check if professor has any courses
          const { data: courses } = await supabase
            .from('courses')
            .select('id')
            .eq('professor_id', data.user.id)
            .limit(1);

          // If no courses, redirect to onboarding to upload files
          if (!courses || courses.length === 0) {
            window.location.href = '/onboarding';
            return;
          } else {
            window.location.href = '/dashboard';
            return;
          }
        } else {
          window.location.href = '/student';
          return;
        }
      } else {
        window.location.href = '/onboarding';
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to log in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription>
          Enter your email and password to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Logging in...
              </>
            ) : (
              'Log in'
            )}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
