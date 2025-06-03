export const dynamic = 'force-dynamic'; // Ensure dynamic rendering for searchParams
import { prisma } from '@/app/lib/prisma';
import { notFound } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card'; // Removed CardTitle as it's not used directly here for the main card
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostCard } from '@/app/components/PostCard';
import Pagination from '@/app/components/Pagination';
import { getSupabaseUser } from '@/app/lib/supabase/server';
import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, CalendarDays, Briefcase, MapPin, UserCircle, GraduationCap, ListTree } from 'lucide-react';
import { format, startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { VoteType, Prisma } from '@prisma/client'; // Added Prisma
import { SortPostsDropdown, SortOption } from '../../components/SortPostsDropdown'; // Corrected path

const POSTS_PER_PAGE = 5;
const COMMENTS_PER_PAGE = 10;

// Define the expected shape of the resolved searchParams object
interface ResolvedSearchParams {
  postsPage?: string;
  commentsPage?: string;
  tab?: string;
  postsSort?: string;
}

// Define the expected shape of the resolved params object
interface ResolvedParams {
  username: string;
}

interface UserProfilePageProps {
  params: Promise<ResolvedParams>; // Changed to Promise
  searchParams: Promise<ResolvedSearchParams>; // Changed to Promise
}

async function getUserProfileData(userName: string, searchParamsPropFromPage: Promise<ResolvedSearchParams>) { // searchParamsPropFromPage is a Promise
  noStore();

  // Apply the "await" pattern to the searchParams object itself
  const resolvedSearchParams = await searchParamsPropFromPage;

  // Parse search params for pagination and active tab
  let parsedPostsPage = 1;
  if (resolvedSearchParams.postsPage && typeof resolvedSearchParams.postsPage === 'string') {
    const parsed = parseInt(resolvedSearchParams.postsPage, 10);
    if (!isNaN(parsed) && parsed > 0) {
      parsedPostsPage = parsed;
    }
  }

  let parsedCommentsPage = 1;
  if (resolvedSearchParams.commentsPage && typeof resolvedSearchParams.commentsPage === 'string') {
    const parsed = parseInt(resolvedSearchParams.commentsPage, 10);
    if (!isNaN(parsed) && parsed > 0) {
      parsedCommentsPage = parsed;
    }
  }

  // Parse and validate postsSort parameter
  const validSortOptions: SortOption[] = ['recent', 'top-today', 'top-week', 'top-month', 'top-year'];
  const postsSortToUse = resolvedSearchParams.postsSort && validSortOptions.includes(resolvedSearchParams.postsSort as SortOption)
    ? resolvedSearchParams.postsSort as SortOption
    : 'recent';

  const validTabs = ['posts', 'comments', 'activity'];
  const determinedActiveTab = (
    resolvedSearchParams.tab &&
    typeof resolvedSearchParams.tab === 'string' &&
    validTabs.includes(resolvedSearchParams.tab)
  ) ? resolvedSearchParams.tab : 'posts';
  const user = await prisma.user.findUnique({
    where: { userName },
    select: {
      id: true,
      userName: true,
      fullName: true,
      imageUrl: true,
      bioDescription: true,
      createdAt: true,
      campusLocations: true,
      occupationRole: true,
      customLinks: true,
      userPrimaryRole: true,
      nim: true,
      studentMajor: true,
      studentBatch: true,
      employeeId: true,
      employeeDepartment: true,
    }
  });

  if (!user) {
    notFound();
  }

  // Date filtering logic for posts based on postsSortToUse
  let postsDateFilter: Prisma.PostWhereInput = {};
  const now = new Date();
  if (postsSortToUse !== 'recent') {
    switch (postsSortToUse) {
      case 'top-today':
        postsDateFilter = { createdAt: { gte: startOfToday(), lte: endOfToday() } };
        break;
      case 'top-week':
        postsDateFilter = { createdAt: { gte: startOfWeek(now, { weekStartsOn: 1 }), lte: endOfWeek(now, { weekStartsOn: 1 }) } };
        break;
      case 'top-month':
        postsDateFilter = { createdAt: { gte: startOfMonth(now), lte: endOfMonth(now) } };
        break;
      case 'top-year':
        postsDateFilter = { createdAt: { gte: startOfYear(now), lte: endOfYear(now) } };
        break;
    }
  }

  const postsWhereClause: Prisma.PostWhereInput = {
    userId: user.id,
    ...postsDateFilter,
  };

  const postsOrderByClause: Prisma.PostOrderByWithRelationInput[] | Prisma.PostOrderByWithRelationInput =
  postsSortToUse === 'recent'
    ? { createdAt: Prisma.SortOrder.desc }
    : [{ netVoteScore: Prisma.SortOrder.desc }, { createdAt: Prisma.SortOrder.desc }];

  const postsCount = await prisma.post.count({
    where: postsWhereClause, // Use combined where clause for accurate count
  });

  const posts = await prisma.post.findMany({
    where: postsWhereClause, // Use combined where clause
    select: { // Use select exclusively, nest relations
      id: true,
      title: true,
      textContent: true,
      imageString: true,
      createdAt: true,
      updatedAt: true,
      subName: true,
      userId: true,
      User: { select: { userName: true, imageUrl: true, fullName: true } },
      vote: { select: { userId: true, voteType: true } },
      _count: { select: { comment: true } },
      netVoteScore: true, // Ensure netVoteScore is selected
    },
    orderBy: postsOrderByClause, // Use dynamic order by clause
    skip: (parsedPostsPage - 1) * POSTS_PER_PAGE,
    take: POSTS_PER_PAGE,
  });

  const commentsCount = await prisma.comment.count({
    where: { userId: user.id },
  });

  const comments = await prisma.comment.findMany({
    where: { userId: user.id },
    include: {
      Post: { select: { id: true, title: true, subName: true } }, // Corrected based on lint (uppercase Post)
    },
    orderBy: { createdAt: 'desc' },
    skip: (parsedCommentsPage - 1) * COMMENTS_PER_PAGE,
    take: COMMENTS_PER_PAGE,
  });

  // --- START: New logic for 'Most Active In' BHubs ---
  const userPostsForActivity = await prisma.post.findMany({
    where: { userId: user.id },
    select: { subName: true },
  });

  const userCommentsForActivity = await prisma.comment.findMany({
    where: { userId: user.id },
    select: {
      Post: {
        select: { subName: true },
      },
    },
  });

  const bhubActivity: { [key: string]: { name: string, posts: number, comments: number, score: number } } = {};

  userPostsForActivity.forEach(post => {
    if (post.subName) {
      const hubName = post.subName.startsWith('bhub/') ? post.subName.substring(5) : post.subName;
      if (!bhubActivity[hubName]) {
        bhubActivity[hubName] = { name: hubName, posts: 0, comments: 0, score: 0 };
      }
      bhubActivity[hubName].posts++;
      bhubActivity[hubName].score++;
    }
  });

  userCommentsForActivity.forEach(comment => {
    if (comment.Post?.subName) {
      const hubName = comment.Post.subName.startsWith('bhub/') ? comment.Post.subName.substring(5) : comment.Post.subName;
      if (!bhubActivity[hubName]) {
        bhubActivity[hubName] = { name: hubName, posts: 0, comments: 0, score: 0 };
      }
      bhubActivity[hubName].comments++;
      bhubActivity[hubName].score++;
    }
  });

  const sortedBHubs = Object.values(bhubActivity)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  // --- END: New logic for 'Most Active In' BHubs ---

  return {
    user,
    posts,
    postsCount,
    comments,
    commentsCount,
    parsedPostsPage,
    parsedCommentsPage,
    determinedActiveTab,
    postsSortToUse, // Return the validated sort option
    topBHubs: sortedBHubs,
  };
}

export default async function UserProfilePage({ params: paramsProp, searchParams : searchParamsProp  }: UserProfilePageProps) {
  noStore();

  const params = await paramsProp; // paramsProp is a Promise
  const searchParams = await searchParamsProp; // searchParamsProp is a Promise

  const { username } = params;

  // Pass the Promise searchParamsProp directly to getUserProfileData
  // getUserProfileData will await it.
  const profileDataBundle = await getUserProfileData(username, searchParamsProp);


  if (!profileDataBundle || !profileDataBundle.user) {
    notFound();
  }
  const {
    user,
    posts,
    postsCount,
    comments,
    commentsCount,
    parsedPostsPage,
    parsedCommentsPage,
    determinedActiveTab,
    postsSortToUse, // Destructure the sort option
    topBHubs
  } = profileDataBundle;
  const viewingUser = await getSupabaseUser(); // For checking vote status on posts by the current session user

  let parsedCustomLinks: { title: string; url: string }[] = [];
  if (user.customLinks) {
    let potentialLinks: any;
    if (typeof user.customLinks === 'string') {
      try {
        potentialLinks = JSON.parse(user.customLinks);
      } catch (error) {
        console.error('Failed to parse customLinks JSON string:', error);
        potentialLinks = [];
      }
    } else {
      // If Prisma returns it as a non-string (e.g., already an array or object due to Json type)
      potentialLinks = user.customLinks;
    }

    if (Array.isArray(potentialLinks)) {
      parsedCustomLinks = potentialLinks.filter(
        (link: any): link is { title: string; url: string } =>
          typeof link === 'object' &&
          link !== null &&
          typeof link.title === 'string' &&
          typeof link.url === 'string'
      );
    } else {
      // If after parsing (or if it wasn't a string initially) it's not an array, default to empty
      parsedCustomLinks = [];
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center gap-6 p-6">
          <Avatar className="h-24 w-24 md:h-32 md:w-32 border-2 border-primary flex-shrink-0">
            <AvatarImage src={user.imageUrl || undefined} alt={user.userName || 'User avatar'} />
            <AvatarFallback>{user.userName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div className="space-y-2 flex-grow">
            <h1 className="text-3xl font-bold">{user.fullName || user.userName}</h1>
            <p className="text-muted-foreground">@{user.userName}</p>
            <div className="flex items-center text-sm text-muted-foreground">
              <CalendarDays className="mr-2 h-4 w-4" />
              Joined {format(new Date(user.createdAt), 'MMMM do, yyyy')}
            </div>
            {user.bioDescription && (
              <p className="text-sm text-foreground pt-2">{user.bioDescription}</p>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Section for Primary Role, Student Info, Employee Info */}
          <div className="space-y-4">
            {user.userPrimaryRole && (
              <div className="flex items-start">
                <UserCircle className="mr-3 h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Primary Role</h3>
                  <p className="text-sm">{user.userPrimaryRole.charAt(0).toUpperCase() + user.userPrimaryRole.slice(1).toLowerCase()}</p>
                </div>
              </div>
            )}

            {/* Student Information Section */}
            {(user.userPrimaryRole === 'STUDENT' || user.userPrimaryRole === 'BOTH') && (user.nim || user.studentMajor || user.studentBatch) && (
              <div className="flex items-start mt-4">
                <GraduationCap className="mr-3 h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Academic Information</h3>
                  <div className="space-y-1 text-sm">
                    {user.nim && <p><span className="font-medium">NIM:</span> {user.nim}</p>}
                    {user.studentMajor && <p><span className="font-medium">Major:</span> {user.studentMajor}</p>}
                    {user.studentBatch && <p><span className="font-medium">Batch:</span> {user.studentBatch}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Employee Information Section */}
            {(user.userPrimaryRole === 'EMPLOYEE' || user.userPrimaryRole === 'BOTH') && (user.employeeId || user.employeeDepartment) && (
              <div className="flex items-start mt-4">
                <Briefcase className="mr-3 h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Professional Information</h3>
                  <div className="space-y-1 text-sm">
                    {user.employeeId && <p><span className="font-medium">Employee ID:</span> {user.employeeId}</p>}
                    {user.employeeDepartment && <p><span className="font-medium">Department:</span> {user.employeeDepartment}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section for Occupation Roles, Campuses, Custom Links */}
          {((user.occupationRole && user.occupationRole.length > 0) || (user.campusLocations && user.campusLocations.length > 0) || (parsedCustomLinks.length > 0)) && (
            <div className="space-y-4 pt-4 mt-4 border-t border-border">
              {user.occupationRole && user.occupationRole.length > 0 && (
                <div className="flex items-start">
                  <Briefcase className="mr-3 h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Occupation Roles</h3>
                    <div className="flex flex-wrap gap-2">
                      {user.occupationRole.map((role, index) => (
                        <Badge key={index} variant="secondary">{role}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {user.campusLocations && user.campusLocations.length > 0 && (
                <div className="flex items-start mt-4">
                  <MapPin className="mr-3 h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Campus Locations</h3>
                    <div className="flex flex-wrap gap-2">
                      {user.campusLocations.map((location, index) => (
                        <Badge key={index} variant="secondary">{location.replace(/@/g, '')}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {parsedCustomLinks.length > 0 && (
                <div className="flex items-start mt-4">
                  <ExternalLink className="mr-3 h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Links</h3>
                    <ul className="space-y-1">
                      {parsedCustomLinks.map((link, index) => (
                        <li key={index}>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center"
                          >
                            {link.title}
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue={determinedActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="posts" asChild>
            <Link href={`/profile/${username}?tab=posts`} scroll={false}>Posts ({postsCount})</Link>
          </TabsTrigger>
          <TabsTrigger value="comments" asChild>
            <Link href={`/profile/${username}?tab=comments`} scroll={false}>Comments ({commentsCount})</Link>
          </TabsTrigger>
          <TabsTrigger value="activity" asChild>
            <Link href={`/profile/${username}?tab=activity`} scroll={false} className="flex items-center justify-center">
              <ListTree className="mr-2 h-4 w-4" /> Activity
            </Link>
          </TabsTrigger>
        </TabsList>

        {/* Posts Tab Content */}
        <TabsContent value="posts" className="mt-6 space-y-4">
          <div className="flex justify-end mb-4">
            <SortPostsDropdown currentSort={postsSortToUse} />
          </div>
          {posts.length > 0 ? (
            posts.map(post => {
              if (!post || !post.User) return null; // Basic guard for post and its User relation

              const currentUserVoteOnPost = viewingUser?.id && Array.isArray(post.vote)
                ? post.vote.find(v => v.userId === viewingUser.id)?.voteType ?? null
                : null;

              return (
                <PostCard
                  key={post.id}
                  id={post.id}
                  title={post.title}
                  jsonContent={post.textContent}
                  imageString={post.imageString}
                  subName={post.subName || 'General'}
                  userName={post.User.userName || user.userName || 'User'} // Prioritize post.User.userName
                  voteCount={post.netVoteScore ?? 0} // Use netVoteScore
                  commentAmount={post._count.comment}
                  currentPath={`/profile/${username}?tab=posts&postsSort=${postsSortToUse}&postsPage=${parsedPostsPage}`}
                  userVote={currentUserVoteOnPost as VoteType | null}
                  postUserId={post.userId as string} // userId on post is non-nullable
                  currentUserId={viewingUser?.id}
                />
              );
            })
          ) : (
            <Card className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">This user hasn't made any posts yet.</p>
            </Card>
          )}
          {postsCount > POSTS_PER_PAGE && (
            <Pagination totalPages={Math.ceil(postsCount / POSTS_PER_PAGE)} />
          )}
        </TabsContent>

        {/* Comments Tab Content */}
        <TabsContent value="comments" className="mt-6 space-y-4">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <Card key={comment.id} className="p-4">
                <p className="text-sm text-muted-foreground mb-1">
                  Commented on {format(new Date(comment.createdAt), 'MMM d, yyyy, HH:mm')}
                </p>
                <p className="mb-2 text-sm md:text-base">{comment.text}</p>
                {comment.Post && (
                  <Link href={`/post/${comment.Post.id}`} className="text-xs text-primary hover:underline">
                    View post: "{comment.Post.title}" in bhub/{comment.Post.subName || 'General'}
                  </Link>
                )}
              </Card>
            ))
          ) : (
            <Card className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">This user hasn't made any comments yet.</p>
            </Card>
          )}
          {commentsCount > COMMENTS_PER_PAGE && (
            <Pagination totalPages={Math.ceil(commentsCount / COMMENTS_PER_PAGE)} />
          )}
        </TabsContent>

        {/* Activity Tab Content */}
        <TabsContent value="activity" className="mt-6">
          {topBHubs && topBHubs.length > 0 ? (
            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold">Top Community Activity</h3>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {topBHubs.map((hub) => (
                    <li key={hub.name} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 hover:bg-muted/50 transition-colors">
                      <Link href={`/p/${hub.name}`} scroll={false} className="text-primary hover:underline font-semibold text-md mb-1 sm:mb-0">
                        bhub/{hub.name}
                      </Link>
                      <div className="flex items-center space-x-2 mt-1 sm:mt-0">
                        <Badge variant="outline">{hub.posts} {hub.posts === 1 ? 'post' : 'posts'}</Badge>
                        <Badge variant="outline">{hub.comments} {hub.comments === 1 ? 'comment' : 'comments'}</Badge>
                        <Badge variant="secondary">{hub.score} total activity</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">This user has no significant BHub activity yet.</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}