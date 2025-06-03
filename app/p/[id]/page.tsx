import Pagination from "@/app/components/Pagination";
import { PostCard } from "@/app/components/PostCard";
import { SubDescriptionForm } from "@/app/components/SubDescriptionForm";
import BHubPostSearch from '@/app/components/BHubPostSearch';
import { prisma } from "@/app/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getSupabaseUser } from '@/app/lib/supabase/server';
import { Calendar, FileQuestion, ImageDown, Link2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import pfp from "../../../public/pfp.png";
import { Input } from "@/components/ui/input";
import { unstable_noStore as noStore } from "next/cache";
import { VoteType, Prisma } from "@prisma/client"; 
import { SortPostsDropdown, SortOption } from "../../components/SortPostsDropdown"; 
import { subDays, subWeeks, subMonths, subYears, startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'; 

async function getData(name: string, page: string, sort: SortOption) {
  noStore();

  let dateFilter: Prisma.PostWhereInput = {};
  const now = new Date();
  switch (sort) {
    case 'top-today':
      dateFilter = { createdAt: { gte: startOfToday(), lte: endOfToday() } };
      break;
    case 'top-week':
      dateFilter = { createdAt: { gte: startOfWeek(now, { weekStartsOn: 1 }), lte: endOfWeek(now, { weekStartsOn: 1 }) } };
      break;
    case 'top-month':
      dateFilter = { createdAt: { gte: startOfMonth(now), lte: endOfMonth(now) } };
      break;
    case 'top-year':
      dateFilter = { createdAt: { gte: startOfYear(now), lte: endOfYear(now) } };
      break;
  }

  const postWhereClauseForCount: Prisma.PostWhereInput = {
    subName: name,
    ...dateFilter,
  };

  const orderByClause: Prisma.PostOrderByWithRelationInput[] | Prisma.PostOrderByWithRelationInput = 
    sort === 'recent'
      ? { createdAt: Prisma.SortOrder.desc }
      : [{ netVoteScore: Prisma.SortOrder.desc }, { createdAt: Prisma.SortOrder.desc }];

  const [count, data] = await prisma.$transaction([
    prisma.post.count({
      where: postWhereClauseForCount,
    }),
    prisma.subpost.findUnique({
      where: {
        name: name,
      },
      select: {
        name: true,
        createdAt: true,
        description: true,
        userId: true,
        posts: {
          where: dateFilter, 
          orderBy: orderByClause,
          take: 5,
          skip: page ? (Number(page) - 1) * 5 : 0,
          select: {
            comment: {
              select: {
                id: true,
              },
            },
            title: true,
            imageString: true,
            id: true,
            textContent: true,
            userId: true,
            vote: {
              select: {
                userId: true,
                voteType: true,
              },
            },
            netVoteScore: true, 
            User: {
              select: {
                userName: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return { data, count };
}

interface ResolvedSearchParams {
  page?: string;
  sort?: string;
}

interface AppProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<ResolvedSearchParams>; 
}

export default async function SubpostRoute(props: AppProps) {
  const params = await props.params;
  const resolvedSearchParams = await props.searchParams ?? { page: "1", sort: "recent" }; 

  const { id } = params;
  const currentPage = resolvedSearchParams.page || '1';
  const currentSort = (resolvedSearchParams.sort || 'recent') as SortOption;
  
  const validSortOptions: SortOption[] = ['recent', 'top-today', 'top-week', 'top-month', 'top-year'];
  const sortToUse = validSortOptions.includes(currentSort) ? currentSort : 'recent';

  const { data, count } = await getData(id, currentPage, sortToUse);
  const user = await getSupabaseUser();

  type SelectedVoteForCard = {
    userId: string | null;
    voteType: VoteType;
  };

  return (
    <div className="max-w-[1000px] mx-auto flex gap-x-10 mt-4 mb-10">
      <div className="w-[65%] flex flex-col gap-y-5">
        <Card className="px-4 py-3 flex flex-row items-center gap-x-4">
          <Image src={pfp} alt="pfp" className="h-12 w-fit" />
          <Link
            href={user ? `/p/${data?.name}/create` : "/login"}
            className="w-full"
          >
            <Input placeholder="Create your post" />
          </Link>
          <div className="flex items-center gap-x-2">
            <Button variant="outline" size="icon" asChild>
              <Link href={user ? `/p/${data?.name}/create` : "/login"}>
                <ImageDown className="w-4 h-4" />
              </Link>
            </Button>
            <Button variant="outline" size="icon" asChild>
              <Link href={user ? `/p/${data?.name}/create` : "/login"}>
                <Link2 className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </Card>

        <div className="flex justify-end mb-0">
          <SortPostsDropdown currentSort={sortToUse} />
        </div>

        {data?.posts.length === 0 ? (
          <div className="flex min-h-[300px] flex-col justify-center items-center rounded-md border border-dashed p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <FileQuestion className="h-10 w-10 text-primary" />
            </div>
            <h2 className="mt-6 text-xl font-semibold">No post yet</h2>
          </div>
        ) : (
          <>
            {data?.posts
              .filter(post => post && typeof post.userId === 'string') 
              .map((post) => {
                if (!post) return null; 

                const userVoteRecord = user?.id && Array.isArray(post.vote) 
                  ? post.vote.find((v: SelectedVoteForCard) => v.userId === user.id) 
                  : undefined;
                const userVote = userVoteRecord ? userVoteRecord.voteType : null;

                return (
                  <PostCard
                    key={post.id}
                    id={post.id}
                    imageString={post.imageString}
                    title={post.title}
                    commentAmount={post.comment?.length || 0} 
                    subName={data.name as string} 
                    userName={post.User?.userName as string}
                    jsonContent={post.textContent}
                    voteCount={post.netVoteScore as number} 
                    currentPath={`/p/${id}`}
                    userVote={userVote}
                    postUserId={post.userId as string} 
                    currentUserId={user?.id}
                  />
                );
              })}
            <Pagination totalPages={Math.ceil(count / 5)} />
          </>
        )}
      </div>

      <div className="w-[35%]">
        {data && data.name && <BHubPostSearch communityName={data.name} />}
        <Card>
          <div className="bg-muted p-4 font-semibold">About Community</div>
          <div className="p-4">
            <div className="flex items-center gap-x-3">
              <Image
                src={`https://avatar.vercel.sh/${data?.name}`}
                alt="Image of subpost"
                width={60}
                height={60}
                className="rounded-full h-16 w-16"
              />
              <Link href={`/p/${data?.name}`} className="font-medium">
                bhub/{data?.name}
              </Link>
            </div>
            {user?.id === data?.userId ? (
              <SubDescriptionForm
                description={data?.description}
                subName={id}
              />
            ) : (
              <p className="text-sm font-normal text-secondary-foreground mt-3">
                {data?.description}
              </p>
            )}

            <div className="flex gap-x-2 mt-3 items-center">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <p className="font-medium text-sm text-muted-foreground">
                Created at{" "}
                {new Date(data?.createdAt as Date).toLocaleDateString("en-id", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
              </p>
            </div>

            <Separator className="mt-3 mb-5" />

            <Button asChild className="w-full">
              <Link href={user ? `/p/${data?.name}/create` : "/login"}>
                Create Post
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
