import { getSupabaseUser } from '@/app/lib/supabase/server';
import { prisma } from '@/app/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserRoleType, User } from '@prisma/client'; // For displaying role nicely and User type

// Helper function to format UserRoleType for display
const formatUserRole = (role: UserRoleType | null | undefined) => {
  if (!role) return '';
  switch (role) {
    case UserRoleType.STUDENT: return 'Student';
    case UserRoleType.EMPLOYEE: return 'Employee';
    case UserRoleType.BOTH: return 'Student & Employee';
    default: return '';
  }
};

// Helper function to get top BHubs for a user
async function getUserTopBHubs(userId: string, limit: number = 3): Promise<string[]> {
  const userPostsForActivity = await prisma.post.findMany({
    where: { userId, subName: { not: 'PublicSphere' } }, // Exclude PublicSphere
    select: { subName: true },
  });

  const userCommentsForActivity = await prisma.comment.findMany({
    where: { userId, Post: { subName: { not: 'PublicSphere' } } }, // Exclude PublicSphere
    select: { Post: { select: { subName: true } } },
  });

  const bhubActivity: { [key: string]: { name: string, score: number } } = {};

  userPostsForActivity.forEach(post => {
    if (post.subName) {
      const hubName = post.subName.startsWith('bhub/') ? post.subName.substring(5) : post.subName;
      if (hubName === 'PublicSphere') return; // Double check exclusion
      if (!bhubActivity[hubName]) {
        bhubActivity[hubName] = { name: hubName, score: 0 };
      }
      bhubActivity[hubName].score++;
    }
  });

  userCommentsForActivity.forEach(comment => {
    if (comment.Post?.subName) {
      const hubName = comment.Post.subName.startsWith('bhub/') ? comment.Post.subName.substring(5) : comment.Post.subName;
      if (hubName === 'PublicSphere') return; // Double check exclusion
      if (!bhubActivity[hubName]) {
        bhubActivity[hubName] = { name: hubName, score: 0 };
      }
      bhubActivity[hubName].score++;
    }
  });

  return Object.values(bhubActivity)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(hub => hub.name);
}

async function getFriendSuggestions() {
  const supabaseUser = await getSupabaseUser();
  if (!supabaseUser) {
    redirect('/login');
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: supabaseUser.id },
    select: {
      id: true,
      studentMajor: true,
      campusLocations: true,
      userPrimaryRole: true,
      studentBatch: true, // Added for batch matching
      profileComplete: true,
      userName: true, // For key in map
    },
  });

  if (!currentUser) {
    // This case should ideally not happen if supabaseUser exists
    // but good for robustness
    redirect('/login'); 
  }

  if (!currentUser.profileComplete) {
    return { 
      currentUser, 
      suggestedUsers: [], 
      message: "Please complete your profile to get friend suggestions." 
    };
  }

  const whereClauses: any[] = []; // Prisma's OR type can be complex
  const currentUserTopBHubs = await getUserTopBHubs(currentUser.id);

  if (currentUser.studentMajor) {
    whereClauses.push({ studentMajor: currentUser.studentMajor });
  }
  if (currentUser.userPrimaryRole) {
    whereClauses.push({ userPrimaryRole: currentUser.userPrimaryRole });
  }
  if (currentUser.campusLocations && currentUser.campusLocations.length > 0) {
    whereClauses.push({
      campusLocations: {
        hasSome: currentUser.campusLocations,
      },
    });
  }
  // Add studentBatch matching if user is STUDENT or BOTH and has a batch
  if (currentUser.studentBatch && 
      (currentUser.userPrimaryRole === UserRoleType.STUDENT || currentUser.userPrimaryRole === UserRoleType.BOTH)) {
    whereClauses.push({ studentBatch: currentUser.studentBatch });
  }
  // Add shared BHub activity matching
  if (currentUserTopBHubs.length > 0) {
    const bHubClauses = currentUserTopBHubs.map(hubName => ({
      OR: [
        { posts: { some: { subName: hubName } } },
        { posts: { some: { subName: `bhub/${hubName}` } } }, // Check with prefix as well
        { comments: { some: { Post: { subName: hubName } } } },
        { comments: { some: { Post: { subName: `bhub/${hubName}` } } } },
      ]
    }));
    // We want users active in ANY of the current user's top BHubs
    whereClauses.push({ OR: bHubClauses });
  }

  if (whereClauses.length === 0) {
    return { 
      currentUser, 
      suggestedUsers: [], 
      message: "Update your profile with details like major, campus locations, or primary role to find BFriends with similar interests!" 
    };
  }

  const suggestedUsers = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: currentUser.id } }, // Exclude current user
        { profileComplete: true },       // Only suggest complete profiles
        { userName: { not: null } },     // Ensure userName exists for links
        { OR: whereClauses },
      ],
    },
    select: {
      id: true, // Added for key prop fallback
      userName: true,
      fullName: true,
      imageUrl: true,
      studentMajor: true,
      campusLocations: true,
      userPrimaryRole: true,
      studentBatch: true, // For displaying batch badge
      posts: { select: { subName: true } }, // For BHub badge logic
      comments: { select: { Post: { select: { subName: true } } } } // For BHub badge logic
    },
    orderBy: {
      updatedAt: 'desc', 
    },
    take: 20, 
  });

  return { currentUser, suggestedUsers, message: null, currentUserTopBHubs };
}

export default async function FindFriendsPage() {
  const { currentUser, suggestedUsers, message, currentUserTopBHubs } = await getFriendSuggestions();

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold text-center mb-12 text-gray-800 dark:text-white">Find Friends</h1>

      {message && (
        <Card className="max-w-lg mx-auto mb-8 shadow-lg bg-yellow-50 border-yellow-300">
          <CardContent className="p-6">
            <p className="text-center text-yellow-700">{message}</p>
            {message.includes("complete your profile") && (
              <div className="mt-4 text-center">
                <Link href="/settings/profile" className="text-blue-600 hover:underline dark:text-blue-400">
                  Go to Profile Settings
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {suggestedUsers && suggestedUsers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {suggestedUsers.map((user) => (
            <Card key={user.userName || user.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out dark:bg-gray-800">
              <CardContent className="p-6 text-center">
                <Link href={`/profile/${user.userName}`} className="block mb-4">
                  <Avatar className="w-24 h-24 mx-auto mb-3 border-4 border-gray-200 dark:border-gray-700 shadow-md">
                    <AvatarImage src={user.imageUrl || '/default.png'} alt={user.fullName || user.userName || 'User'} />
                    <AvatarFallback>{user.fullName ? user.fullName.charAt(0).toUpperCase() : (user.userName ? user.userName.charAt(0).toUpperCase() : 'U')}</AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white truncate">{user.fullName || user.userName}</h3>
                  {user.userName && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">@{user.userName}</p>}
                </Link>
                
                <div className="space-y-2 mt-4">
                  {currentUser?.studentMajor && user.studentMajor === currentUser.studentMajor && (
                    <Badge variant="outline" className="w-full justify-center py-1">Major: {user.studentMajor}</Badge>
                  )}
                  {currentUser?.userPrimaryRole && user.userPrimaryRole === currentUser.userPrimaryRole && (
                    <Badge variant="outline" className="w-full justify-center py-1">Role: {formatUserRole(user.userPrimaryRole)}</Badge>
                  )}
                  {currentUser?.studentBatch && 
                    (currentUser.userPrimaryRole === UserRoleType.STUDENT || currentUser.userPrimaryRole === UserRoleType.BOTH) && 
                    user.studentBatch === currentUser.studentBatch && (
                    <Badge variant="outline" className="w-full justify-center py-1">Batch: {user.studentBatch}</Badge>
                  )}
                  {currentUser?.campusLocations && currentUser.campusLocations.length > 0 && user.campusLocations && user.campusLocations.some((loc: string) => currentUser.campusLocations.includes(loc)) && (
                    <Badge variant="outline" className="w-full justify-center py-1">Shared Campus</Badge>
                  )}
                  {currentUserTopBHubs && currentUserTopBHubs.length > 0 && 
                    (user.posts?.some((p: { subName: string | null }) => p.subName && currentUserTopBHubs.includes(p.subName.replace('bhub/', ''))) || 
                      user.comments?.some((c: { Post: { subName: string | null } | null }) => c.Post?.subName && currentUserTopBHubs.includes(c.Post.subName.replace('bhub/', '')))) && (
                    <Badge variant="outline" className="w-full justify-center py-1">Shares BHub Interests</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(!suggestedUsers || suggestedUsers.length === 0) && !message && (
        <Card className="max-w-lg mx-auto shadow-lg">
          <CardContent className="p-6 text-center">
            <p className="text-lg text-gray-500 dark:text-gray-400">No new suggestions found right now. Try updating your profile or check back later!</p>
            <p className="text-lg text-muted-foreground">No new suggestions found right now. Try updating your profile or check back later!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Ensure you have a /public/default.png image or update the path.
