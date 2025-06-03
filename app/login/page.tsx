import { createSupabaseServerClient } from '../lib/supabase/server';
import { redirect } from 'next/navigation';
import { LoginForm } from '../components/auth/LoginForm';
import { Suspense } from 'react';

export default async function LoginPage() {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    // If user is already logged in, redirect based on profile completion
    // This logic will be more fleshed out when onboarding middleware is in place
    // We need to fetch the user's profile from our own database (Prisma)
    // The getSupabaseUser() helper gets Supabase auth user, getUserProfile() gets Prisma profile.
    // Let's adjust to use a direct query for now, assuming 'users' table and 'profileComplete' field.
    // This assumes you have a 'users' table in your public schema that Supabase can access directly
    // or you've set up RLS appropriately. For Prisma-managed tables, direct Supabase client queries
    // might not be ideal long-term if RLS isn't set for direct table access by anon/auth key.
    // However, createSupabaseServerClient() uses the service role key on the server, so it should have access.
    
    const { data: userProfile, error: profileError } = await supabase
      .from('User') // Matches Supabase types. VERIFY: Actual DB table name and ensure types/supabase.ts is up-to-date.
      .select('profileComplete')
      .eq('id', session.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116: no rows found, which is fine if profile not created yet
        console.error('Error fetching user profile:', profileError);
        // Decide how to handle this - maybe redirect to error page or home
    }

    if (userProfile && !userProfile.profileComplete) {
      redirect('/onboarding');
    } else {
      // If profile is complete, or profile not found (error handled or PGRST116), redirect to home.
      // This also covers cases where the user record might not yet exist in your public.User table
      // immediately after signup if there's a slight delay or if creation failed silently (should be handled).
      redirect('/');
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white dark:bg-gray-800 p-8 shadow-xl">
        <div>
          {/* You can add a logo here if you have one */}
          {/* <img className="mx-auto h-12 w-auto" src="/logo.svg" alt="BFriends Logo" /> */}
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to BFriends
          </h2>
        </div>
        <Suspense fallback={<div className='text-center text-gray-500 dark:text-gray-400'>Loading form...</div>}>
          <LoginForm />
        </Suspense>
        <p className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
          Don&apos;t have an account yet?{' '}
          <a href="/signup" className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
            Sign up here
          </a>
        </p>
      </div>
    </div>
  );
}
