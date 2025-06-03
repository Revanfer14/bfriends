import { SignUpForm } from '../components/auth/SignUpForm';
import { createSupabaseServerClient } from '../lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function SignUpPage() {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    // If user is already logged in, redirect to home or onboarding based on profile
    // This logic will be more fleshed out when we handle login and middleware
    redirect('/'); 
  }

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-2xl font-bold mb-6">Create your BFriends Account</h1>
      <div className="w-full max-w-md">
        <SignUpForm />
      </div>
    </div>
  );
}
