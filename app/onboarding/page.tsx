import { createSupabaseServerClient } from '../lib/supabase/server';
import { redirect } from 'next/navigation';
import { OnboardingForm } from '../components/auth/OnboardingForm';
import { prisma } from '../lib/prisma';
import { Suspense } from 'react';
import { UserRoleType } from '@prisma/client';

export default async function OnboardingPage() {
  const supabase = createSupabaseServerClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    console.error('Onboarding page: No session or session error, redirecting to login.');
    redirect('/login');
  }

  const userId = session.user.id;
  let userProfile = null;

  try {
    userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        userName: true,
        fullName: true,
        userPrimaryRole: true,
        nim: true,
        studentMajor: true,
        studentBatch: true,
        employeeId: true,
        employeeDepartment: true,
        campusLocations: true,
        bioDescription: true,
        occupationRole: true,
        customLinks: true,
        profileComplete: true,
      },
    });
  } catch (error) {
    console.error('Onboarding page: Error fetching user profile from Prisma:', error);
    redirect('/'); 
  }

  if (!userProfile) {
    console.error('Onboarding page: User profile not found in Prisma for ID:', userId);
    redirect('/'); 
  }

  if (userProfile.profileComplete) {
    redirect('/');
  }

  const initialCustomLinks = (userProfile.customLinks && Array.isArray(userProfile.customLinks)) 
    ? userProfile.customLinks 
    : [];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-2xl space-y-8 rounded-xl bg-white dark:bg-gray-800 p-8 shadow-xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Help others connect with you by filling out your BFriends profile.
          </p>
        </div>
        <Suspense fallback={<div className='text-center text-gray-500 dark:text-gray-400'>Loading form...</div>}>
          <OnboardingForm 
            initialData={{
              email: userProfile.email,
              fullName: userProfile.fullName,
              userName: userProfile.userName,
              userPrimaryRole: userProfile.userPrimaryRole as UserRoleType | undefined,
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
