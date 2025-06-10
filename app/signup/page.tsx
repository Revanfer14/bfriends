import { Suspense } from 'react';
import { SignUpForm } from '../components/auth/SignUpForm';
import { createSupabaseServerClient } from '../lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function SignUpPage() {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    redirect('/'); 
  }

  return (
    <div className="flex min-h-[90vh] flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="w-full max-w-md space-y-8 rounded-xl bg-white dark:bg-gray-800 p-8 shadow-xl">
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                Sign up to BFriends
              </h2>
            </div>
            <Suspense fallback={<div className='text-center text-gray-500 dark:text-gray-400'>Loading form...</div>}>
              <SignUpForm/>
            </Suspense>
            <p className="mt-7 text-center text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{' '}
              <a href="/signup" className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                Sign in here
              </a>
            </p>
          </div>
        </div>
  );
}
