import { prisma } from "@/app/lib/prisma";
import { PostCard } from "@/app/components/PostCard";
import Pagination from "@/app/components/Pagination";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { Post, Vote, VoteType, User as PrismaUser, Subpost as PrismaSubpost, Prisma } from "@prisma/client";
import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LayoutGrid } from 'lucide-react';

// Define a more specific type for the posts we fetch
type PostWithDetails = Post & { // Post type from Prisma client already includes userId (possibly as string | null)
  User: Pick<PrismaUser, 'userName' | 'imageUrl'> | null;
  Subpost: Pick<PrismaSubpost, 'name'> | null; // Relation is Subpost (capitalized)
  vote: Vote[]; // Relation is vote (singular)
  _count: {
    comment: number;
  };
};

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    community?: string; // Added community param
  }>;
}

const POSTS_PER_PAGE = 10;
const RELATED_ITEMS_LIMIT = 5;

export default async function SearchPage({ searchParams }: SearchPageProps) {
  noStore(); // Opt out of caching for dynamic search results
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q || "";
  const currentPage = Number(resolvedSearchParams.page) || 1;
  const communityFilter = resolvedSearchParams.community || null;

  if (!query) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Search Results</h1>
        <p>Please enter a search term to find posts.</p>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();

  // Fetch related users
  const relatedUsers = await prisma.user.findMany({
    where: {
      OR: [
        {
          userName: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          fullName: {
            contains: query,
            mode: 'insensitive',
          },
        },
      ],
    },
    take: RELATED_ITEMS_LIMIT,
    select: {
      userName: true,
      fullName: true,
      imageUrl: true,
    },
  });

  // Fetch related BHubs (Subposts)
  const relatedBHubs = await prisma.subpost.findMany({
    where: {
      name: {
        contains: query,
        mode: 'insensitive',
      },
    },
    take: RELATED_ITEMS_LIMIT,
    select: {
      name: true,
    },
  });
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const currentUserId = authUser?.id;

  let whereClause: Prisma.PostWhereInput;

  const baseQueryConditions: Prisma.PostWhereInput = {
    OR: [
      {
        title: {
          contains: query,
          mode: 'insensitive' as const,
        },
      },
      // Add other fields to search if needed, e.g., textContent (might require different handling for JSON)
    ],
  };

  if (communityFilter) {
    whereClause = {
      AND: [
        baseQueryConditions,
        { subName: communityFilter },
      ],
    };
  } else {
    whereClause = baseQueryConditions;
  }

  const totalPosts = await prisma.post.count({
    where: whereClause,
  });

  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

  const postsData: PostWithDetails[] = await prisma.post.findMany({
    where: whereClause,
    include: {
      User: {
        select: {
          userName: true,
          imageUrl: true,
        },
      },
      Subpost: { 
        select: {
          name: true,
        },
      },
      vote: true, // Relation is vote (singular)
      _count: {
        select: { comment: true },
      },
      // userId is a scalar field on Post and will be included by default
      // as long as there's no top-level 'select' for Post itself.
    },
    orderBy: {
      createdAt: "desc", 
    },
    skip: (currentPage - 1) * POSTS_PER_PAGE,
    take: POSTS_PER_PAGE,
  });

  const processedPosts = postsData
    .filter(post => typeof post.userId === 'string') // Ensure userId is non-null and a string
    .map(post => {
    let voteCount = 0;
    let userVote: VoteType | null = null;

    post.vote.forEach((v: Vote) => { // Explicitly type 'v' as Vote if needed by TS
      if (v.voteType === VoteType.UP) {
        voteCount++;
      } else if (v.voteType === VoteType.DOWN) {
        voteCount--;
      }
      if (currentUserId && v.userId === currentUserId) {
        userVote = v.voteType;
      }
    });

    const subName = post.Subpost?.name?.startsWith('bhub/') 
                     ? post.Subpost.name.substring(5) 
                    : post.Subpost?.name || 'General';

    return {
      id: post.id,
      title: post.title,
      imageString: post.imageString,
      jsonContent: post.textContent, 
      subName: subName,
      userName: post.User?.userName || 'Unknown User',
      userImageUrl: post.User?.imageUrl, // Pass to PostCard if it uses it
      voteCount: voteCount,
      commentAmount: post._count.comment,
      currentPath: `/search?q=${encodeURIComponent(query)}&page=${currentPage}`,
      userVote: userVote,
      postUserId: post.userId as string, // Safe due to the filter above
      currentUserId: currentUserId,
    };
  });

  return (
    <div className="container mx-auto p-4"> {/* Adjusted max-width later if needed, or keep it on a parent of the flex container */}
      <h1 className="text-2xl font-bold mb-6">
        Search Results for: <span className="text-primary">{query}</span>
        {communityFilter && (
          <span className="text-lg text-muted-foreground ml-2">
            in bhub/{communityFilter}
          </span>
        )}
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content: Posts */}
        <div className="lg:w-2/3 w-full">
          {(postsData.length > 0 || (relatedBHubs.length === 0 && relatedUsers.length === 0 && processedPosts.length > 0)) && (
            <h2 className="text-xl font-semibold mb-4">Posts</h2>
          )}
          {processedPosts.length === 0 && relatedBHubs.length === 0 && relatedUsers.length === 0 ? (
            <p>No results found for "{query}"{communityFilter ? ` in bhub/${communityFilter}` : ''}.</p>
          ) : processedPosts.length === 0 && (relatedBHubs.length > 0 || relatedUsers.length > 0) ? (
            <p>No posts found matching "{query}"{communityFilter ? ` in bhub/${communityFilter}` : ''}, but we found related BHubs or People.</p>
          ) : (
            <div className="space-y-6">
              {processedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  id={post.id}
                  title={post.title}
                  imageString={post.imageString}
                  jsonContent={post.jsonContent as any}
                  subName={post.subName}
                  userName={post.userName}
                  userImageUrl={post.userImageUrl} // This prop should now be accepted
                  voteCount={post.voteCount}
                  commentAmount={post.commentAmount}
                  currentPath={post.currentPath}
                  userVote={post.userVote}
                  postUserId={post.postUserId} // Pass the post author's ID from processedPost
                  currentUserId={post.currentUserId} // Pass the current logged-in user's ID from processedPost
                />
              ))}
            </div>
          )}

          {totalPages > 1 && processedPosts.length > 0 && (
            <div className="mt-8">
              <Pagination totalPages={totalPages} />
            </div>
          )}
        </div>

        {/* Sidebar: Related BHubs and People */}
        {(relatedBHubs.length > 0 || relatedUsers.length > 0) && (
          <div className="lg:w-1/3 w-full lg:sticky lg:top-24 self-start space-y-8">
            {relatedBHubs.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-3">Related BHubs</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-4">
                  {relatedBHubs.map((bhub) => (
                    <Link key={bhub.name} href={`/p/${bhub.name}`} className="block p-4 border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center space-x-3">
                        <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{bhub.name.startsWith('bhub/') ? bhub.name : `bhub/${bhub.name}`}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {relatedUsers.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-3">Related People</h2>
                <div className="space-y-4">
                  {relatedUsers.map((user) => (
                    <Link key={user.userName} href={`/profile/${user.userName}`} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent transition-colors">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.imageUrl || undefined} alt={user.userName || 'User avatar'} />
                        <AvatarFallback>{user.userName ? user.userName.substring(0, 2).toUpperCase() : 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.fullName || user.userName}</p>
                        {user.fullName && <p className="text-sm text-muted-foreground">@{user.userName}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
