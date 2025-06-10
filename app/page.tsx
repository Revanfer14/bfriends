import { Card } from "@/components/ui/card";
import Image from "next/image";
import Banner from "../public/banner.png";
import HelloImage from "../public/hero-image.png";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { CreatePostCard } from "./components/CreatePostCard";
import { SortPostsDropdown, SortOption } from "./components/SortPostsDropdown";
import { prisma } from "./lib/prisma";
import { PostCard } from "./components/PostCard";
import { Suspense } from "react";
import { SuspenseCard } from "./components/SuspenseCard";
import Pagination from "./components/Pagination";
import { unstable_noStore as noStore } from "next/cache";
import {
  subDays,
  subWeeks,
  subMonths,
  subYears,
  startOfToday,
  endOfToday,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import pfp from "../public/pfp.png";
import { getSupabaseUser } from "@/app/lib/supabase/server";
import { VoteType, Vote } from "@prisma/client";

async function getData(page: string, sort: SortOption) {
  noStore();

  let dateFilter = {};
  const now = new Date();

  switch (sort) {
    case "top-today":
      dateFilter = { createdAt: { gte: startOfToday(), lte: endOfToday() } };
      break;
    case "top-week":
      // Prisma typically uses ISO strings or Date objects. date-fns provides Date objects.
      // Ensure your Prisma version handles date-fns outputs correctly or convert to ISO string if needed.
      dateFilter = {
        createdAt: {
          gte: startOfWeek(now, { weekStartsOn: 1 }),
          lte: endOfWeek(now, { weekStartsOn: 1 }),
        },
      };
      break;
    case "top-month":
      dateFilter = {
        createdAt: { gte: startOfMonth(now), lte: endOfMonth(now) },
      };
      break;
    case "top-year":
      dateFilter = {
        createdAt: { gte: startOfYear(now), lte: endOfYear(now) },
      };
      break;
    // 'recent' doesn't need a specific date filter beyond normal pagination
  }

  const orderByClause =
    sort === "recent"
      ? { createdAt: Prisma.SortOrder.desc }
      : [
          { netVoteScore: Prisma.SortOrder.desc },
          { createdAt: Prisma.SortOrder.desc },
        ]; // Sort by netVoteScore then by createdAt

  const queryWhere = {
    ...dateFilter,
    // Add any other general filters here if needed in the future
  };

  const [count, data] = await prisma.$transaction([
    prisma.post.count({ where: queryWhere }),
    prisma.post.findMany({
      where: queryWhere,
      take: 5,
      skip: page ? (Number(page) - 1) * 5 : 0,
      select: {
        title: true,
        createdAt: true,
        textContent: true,
        id: true,
        imageString: true,
        comment: {
          select: {
            id: true,
          },
        },
        User: {
          select: {
            userName: true,
          },
        },
        userId: true, // Added: Select the post author's ID
        subName: true,
        vote: {
          select: {
            userId: true,
            voteType: true,
            postId: true,
          },
        },
        netVoteScore: true, // Select the netVoteScore
      },
      orderBy: orderByClause,
    }),
  ]);

  return { data, count };
}

// Define the actual shape of searchParams object
interface ResolvedSearchParams {
  page?: string;
  sort?: string;
}

interface AppProps {
  searchParams: Promise<ResolvedSearchParams>; // searchParams is a Promise
}

export default async function Home(props: AppProps) {
  const searchParams = await props.searchParams; // Await the searchParams Promise
  const user = await getSupabaseUser();

  const currentPage = searchParams?.page || "1";
  const currentSort = (searchParams?.sort || "recent") as SortOption;
  // Validate sort param, default to 'recent' if invalid
  const validSortOptions: SortOption[] = [
    "recent",
    "top-today",
    "top-week",
    "top-month",
    "top-year",
  ];
  const sortToUse = validSortOptions.includes(currentSort)
    ? currentSort
    : "recent";
  return (
    <div className="max-w-[1200px] mx-auto flex gap-x-15 mt-4 mb-5">
      <div className="w-[65%] flex flex-col gap-y-5">
        <CreatePostCard />
        <div className="flex justify-end">
          <SortPostsDropdown currentSort={sortToUse} />
        </div>
        <Suspense
          fallback={<SuspenseCard />}
          key={`${currentPage}-${sortToUse}`}
        >
          <ShowItems
            searchParams={{ page: currentPage, sort: sortToUse }}
            userId={user?.id}
          />
        </Suspense>
      </div>

      <div className="w-[35%] ">
        <Card>
          <Image src={Banner} alt="Banner" />
          <div className="p-2">
            <div className="flex items-center">
              <Image
                src={HelloImage}
                alt="Hello Image"
                className="w-10 h-16 -mt-6"
              />
              <h1 className="font-medium pl-2">Home</h1>
            </div>
            <p className="text-sm text-muted-foreground pt-2">
              Hey Binusian! Welcome to BFriends – your campus spaceport. Explore
              BHubs, launch your thoughts, share discoveries and connect with
              your crew!
            </p>

            <Separator className="mt-3 mb-5" />

            <div className="flex flex-col gap-y-3">
              <Button variant="secondary" asChild>
                <Link href="/p/PublicSphere/create">
                  Create Post in PublicSphere
                </Link>
              </Button>
              <Button asChild>
                <Link href="/p/create">Create Community</Link>
              </Button>
            </div>
          </div>
        </Card>
        <div className="mt-4">
          <Card className="flex flex-col p-4">
            <div className="flex items-center gap-x-2">
              <Image src={pfp} alt="pfp" className="h-10 w-10" />
              <h1 className="font-bold">GUIDELINES</h1>
            </div>
            <Separator className="mt-2" />
            <div className="flex flex-col gap-y-5 mt-5">
              {[
                {
                  id: 1,
                  text: "Be respectful and kind",
                },
                {
                  id: 2,
                  text: "Keep your posts on-topic for each BHub.",
                },
                {
                  id: 3,
                  text: "Follow University's rules (PTTAK) – rule-breaking has consequences",
                },
              ].map((item) => (
                <div key={item.id}>
                  <p className="text-sm font-medium">
                    {item.id}. {item.text}
                  </p>
                  <Separator className="mt-2" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

type SelectedVote = {
  userId: string | null;
  voteType: VoteType;
  postId: string | null;
};

async function ShowItems({
  searchParams,
  userId,
}: {
  searchParams: { page: string; sort: SortOption };
  userId?: string;
}) {
  const { page, sort } = searchParams;
  const { count, data } = await getData(page, sort);
  return (
    <>
      {data
        .filter((post) => typeof post.userId === "string")
        .map((post) => {
          const userVoteRecord = userId
            ? post.vote.find((v: SelectedVote) => v.userId === userId)
            : undefined;
          const userVote = userVoteRecord
            ? (userVoteRecord.voteType as VoteType)
            : null;
          return (
            <PostCard
              key={post.id}
              imageString={post.imageString}
              jsonContent={post.textContent}
              subName={post.subName as string}
              title={post.title}
              commentAmount={post.comment.length}
              userName={post.User?.userName as string}
              id={post.id}
              voteCount={post.netVoteScore} // Use the pre-calculated netVoteScore
              currentPath="/"
              userVote={userVote}
              postUserId={post.userId as string} // Safe due to the filter above
              currentUserId={userId} // Pass the current logged-in user's ID from ShowItems props
            />
          );
        })}

      <Pagination totalPages={Math.ceil(count / 5)} />
    </>
  );
}
