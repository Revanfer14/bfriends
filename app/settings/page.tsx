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

  // Safely parse customLinks
  let parsedCustomLinks: CustomLink[] = [];
  if (userProfileFromDb.customLinks && Array.isArray(userProfileFromDb.customLinks)) {
    // Filter and type-check each link
    parsedCustomLinks = userProfileFromDb.customLinks.reduce((acc: CustomLink[], link: any) => {
      if (typeof link === 'object' && link !== null && 
          typeof link.title === 'string' && typeof link.url === 'string') {
        acc.push({ title: link.title, url: link.url });
      }
      return acc;
    }, []);
  }

  // Return the database profile with customLinks parsed
  return {
    ...userProfileFromDb,
    customLinks: parsedCustomLinks, // Ensure customLinks is always an array
  };
}

export default async function SettingsPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Settings page: No Supabase user or auth error, redirecting to login.');
    redirect('/login'); // Redirect to your Supabase login page
  }

  const userProfile = await getUserSettings(user.id);

  if (!userProfile) {
    console.error('Settings page: User profile not found in Prisma for Supabase ID:', user.id);
    // This could happen if a user exists in Supabase Auth but not in your Prisma user table
    // Or if the onboarding wasn't completed fully.
    // Consider redirecting to onboarding or showing an error message.
    redirect('/onboarding'); // Or redirect to home or an error page
    return null; // Ensure no further rendering attempt
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl"> {/* Adjusted page container */}
      <div className="mb-8"> {/* Wrapper for heading and description */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          User Settings
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage your profile information, preferences, and account details.
        </p>
      </div>
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md dark:bg-gray-800"> {/* Form container */}
        {/* 
          The SettingsForm component will likely need to be updated to accept 
          the full userProfile object and use Supabase-compatible actions for updates.
          This is a placeholder for now.
        */}
        <SettingsForm 
          userProfile={userProfile} // Pass the fetched and slightly processed user profile
        />
        {/* Example of displaying some data directly:
        <p>Email: {userProfile.email}</p>
        <p>Username: {userProfile.userName || 'Not set'}</p>
        <p>Full Name: {userProfile.fullName || 'Not set'}</p>
        */}
      </div>
    </div>
  );
}
