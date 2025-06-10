import { createSupabaseServerClient } from '../lib/supabase/server';
import { prisma } from '../lib/prisma';
import { redirect } from 'next/navigation';
import { SettingsForm } from '../components/SettingsForm';
import { unstable_noStore as noStore } from 'next/cache';

import { CustomLink } from '../lib/definitions'; // UserProfileData might be too restrictive here

async function getUserSettings(userId: string) { // Return type will be inferred or adjusted based on SettingsForm needs
  noStore(); 
  const userProfileFromDb = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      userName: true,
      email: true,
      fullName: true,
      imageUrl: true,
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

  if (!userProfileFromDb) {
    return null;
  }

  let parsedCustomLinks: CustomLink[] = [];
  if (userProfileFromDb.customLinks && Array.isArray(userProfileFromDb.customLinks)) {
    parsedCustomLinks = userProfileFromDb.customLinks.reduce((acc: CustomLink[], link: any) => {
      if (typeof link === 'object' && link !== null && 
          typeof link.title === 'string' && typeof link.url === 'string') {
        acc.push({ title: link.title, url: link.url });
      }
      return acc;
    }, []);
  }

  return {
    ...userProfileFromDb,
    customLinks: parsedCustomLinks, 
  };
}

export default async function SettingsPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Settings page: No Supabase user or auth error, redirecting to login.');
    redirect('/login');
  }

  const userProfile = await getUserSettings(user.id);

  if (!userProfile) {
    console.error('Settings page: User profile not found in Prisma for Supabase ID:', user.id);
    redirect('/onboarding');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8"> 
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          User Settings
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage your profile information, preferences, and account details.
        </p>
      </div>
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md dark:bg-gray-800">
        {
        }
        <SettingsForm 
          userProfile={userProfile}
        />
        {}
      </div>
    </div>
  );
}
