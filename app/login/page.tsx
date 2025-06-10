import { createSupabaseServerClient } from '../lib/supabase/server';
import { redirect } from 'next/navigation';
import { LoginForm } from '../components/auth/LoginForm';
import { Suspense } from 'react';

export default async function LoginPage() {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    
    const { data: userProfile, error: profileError } = await supabase
      .from('User')
      .select('profileComplete')
      .eq('id', session.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching user profile:', profileError);
    }

    if (userProfile && !userProfile.profileComplete) {
      redirect('/onboarding');
    } else {
      redirect('/');
    }
  }

  return (
    <div className="flex min-h-[90vh] flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white dark:bg-gray-800 p-8 shadow-xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to BFriends
          </h2>
        </div>
        <Suspense fallback={<div className='text-center text-gray-500 dark:text-gray-400'>Loading form...</div>}>
          <LoginForm />
        </Suspense>
        <p className="mt-7 text-center text-sm text-gray-500 dark:text-gray-400">
          Don&apos;t have an account yet?{' '}
          <a href="/signup" className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
            Sign up here
          </a>
        </p>
      </div>
    </div>
  );
}
