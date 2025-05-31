import { createSupabaseServerClient } from '../lib/supabase/server'; // Adjusted path
import { redirect } from 'next/navigation';
import { OnboardingForm } from '../components/auth/OnboardingForm'; // Adjusted path, will create next
import { prisma } from '../lib/prisma'; // Adjusted path
import { Suspense } from 'react';

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
        userName: true,
        fullName: true,
        universityId: true,
        departmentMajor: true,
        bioDescription: true,
        occupationRole: true,
        batch: true,
        customLinks: true,
        profileComplete: true,
      },
    });
  } catch (error) {
    console.error('Onboarding page: Error fetching user profile from Prisma:', error);
    // Potentially redirect to an error page or home
    redirect('/'); 
  }

  if (!userProfile) {
    console.error('Onboarding page: User profile not found in Prisma for ID:', userId);
    // This case should ideally not happen if signup creates a profile.
    // Redirecting to home or an error page.
    redirect('/'); 
  }

  if (userProfile.profileComplete) {
    redirect('/'); // Already onboarded, go to home
  }

  // Convert Prisma's JsonValue for customLinks to a plain object or string for the form
  // Assuming customLinks is stored as an object e.g., { github: 'url', linkedin: 'url' }
  // For simplicity, if it's complex, the form component might need to handle parsing/stringifying.
  // Let's assume for now it's an object that can be stringified if needed by the form.
  const initialCustomLinks = userProfile.customLinks && typeof userProfile.customLinks === 'object' 
    ? JSON.stringify(userProfile.customLinks) 
    : '';

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
            userId={userId} 
            initialData={{
              ...userProfile,
              customLinks: initialCustomLinks, // Pass stringified version or handle object in form
              occupationRole: userProfile.occupationRole || [], // Ensure it's an array
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
