// app/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '../../../types/supabase'; // ENSURE THIS PATH IS CORRECT

export function createSupabaseServerClient() {
  // We will call cookies() inside each method below for freshness

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies(); // Call cookies() here
          return cookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            const cookieStore = await cookies(); // Call cookies() here
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // This can happen if set is called in a context where cookies can't be written (e.g. Server Component render path)
            // Supabase SSR library is designed to handle this, often in conjunction with middleware for session refresh.
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            const cookieStore = await cookies(); // Call cookies() here
            // To remove, set value to empty and often maxAge to 0 or expires to past date
            cookieStore.set({ name, value: '', ...options });
            // Or, if using cookies().delete(), ensure it's appropriate for the context:
            // cookieStore.delete({ name, ...options });
          } catch (error) {
            // Same context as set
          }
        },
      },
    }
  );
}

// Helper function to get the currently authenticated user on the server
export async function getSupabaseUser() {
  const supabase = createSupabaseServerClient();
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.log('Info: No active Supabase session found (this is normal for unauthenticated users):', error.message);
      return null;
    }
    return user;
  } catch (error) {
    console.error('Exception fetching Supabase user:', error);
    return null;
  }
}

// Helper function to get the user's profile from your Prisma database
export async function getUserProfile() {
  const supabaseUser = await getSupabaseUser();
  if (!supabaseUser) return null;

  // Dynamically import prisma client
  // Ensure this path is correct: from app/lib/supabase/server.ts to app/lib/prisma.ts
  const { prisma } = await import('../../lib/prisma');
  if (!prisma) {
    console.error('Prisma client not available');
    return null;
  }

  try {
    const userProfile = await prisma.user.findUnique({
      where: { id: supabaseUser.id },
    });
    return userProfile;
  } catch (error) {
    console.error('Error fetching user profile from Prisma:', error);
    return null;
  }
}