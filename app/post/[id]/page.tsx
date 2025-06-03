import { handleVote } from "@/app/actions";
import { CommentForm } from "@/app/components/CommentForm";
import { CommentCard } from '@/app/components/CommentCard';
import { CopyLink } from "@/app/components/CopyLink";
import { PostActions } from '@/app/components/PostActions';
import { RenderToJson } from "@/app/components/RendertoJson";
import { DownVote, UpVote } from "@/app/components/SubmitButtons";
import { prisma } from "@/app/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import pfp from "../../../public/pfp.png";
import { getSupabaseUser } from '@/app/lib/supabase/server';
import { VoteType } from "@prisma/client";

async function getData(id: string) {
  noStore();
  const data = await prisma.post.findUnique({
    where: {
      id: id,
    },
    select: {
      createdAt: true,
      title: true,
      imageString: true,
      textContent: true,
      subName: true,
      id: true,
      userId: true, // Added: Select the post author's ID
      vote: {
        select: {
          voteType: true,
          userId: true,
        },
      },

      comment: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          text: true,
          userId: true, // Added: Select the commenter's ID
          User: {
            select: {
              imageUrl: true,
              userName: true,
            },
          },
        },
      },
      Subpost: {
        select: {
          name: true,
          createdAt: true,
          description: true,
        },
      },
      User: {
        select: {
          userName: true,
        },
      },
    },
  });

  if (!data) {
    return notFound();
  }

  return data;
}

interface AppProps {
  params: Promise<{ id: string }>;
}

export default async function PostPage(props: AppProps) {
  const params = await props.params;
  const user = await getSupabaseUser();

  const { id } = params;
  const data = await getData(id);

  const userVoteRecord = user?.id ? data.vote.find(v => v.userId === user.id) : undefined;
  const userVote = userVoteRecord ? userVoteRecord.voteType as VoteType : null;

  const defaultImage = "/default.png";

  return (
    <div className="max-w-[1200px] mx-auto flex gap-x-10 mt-4 mb-10 px-5 lg:px-14">
      <div className="w-[70%] flex flex-col gap-y-5">
        <Card className="p-2 flex items-start flex-row">
          <div className="flex flex-col items-center gap-y-2 p-2">
            <form action={handleVote}>
              <input type="hidden" name="voteDirection" value="UP" />
              <input type="hidden" name="postId" value={data.id} />
              <input type="hidden" name="path" value={`/post/${id}`} />
              <UpVote userVote={userVote} />
            </form>

            {/* Votes counter */}
            {data.vote.reduce((acc, vote) => {
              if (vote.voteType === "UP") return acc + 1;
              if (vote.voteType === "DOWN") return acc - 1;

              return acc;
            }, 0)}

            <form action={handleVote}>
              <input type="hidden" name="voteDirection" value="DOWN" />
              <input type="hidden" name="postId" value={data.id} />
              <input type="hidden" name="path" value={`/post/${id}`} />
              <DownVote userVote={userVote} />
            </form>
          </div>

          <div className="p-2 w-full">
            <p className="text-xs text-muted-foreground">
              Posted by {data.User?.userName}
            </p>
            <h1 className="font-medium mt-1 text-lg">{data.title}</h1>

            {data.imageString && (
              <Image
                src={data.imageString}
                alt="Post image"
                width={500}
                height={400}
                className="w-full h-auto object-contain mt-2"
              />
            )}

            {data.textContent && (
              <RenderToJson
                data={
                  typeof data.textContent === "string"
                    ? JSON.parse(data.textContent)
                    : data.textContent
                }
              />
            )}

            <Separator className="my-5" />

            <div className="flex gap-x-5 items-center mt-3">
              <div className="flex gap-x-1 items-center">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <p className="text-muted-foreground text-xs font-medium">
                  {data.comment.length} Comments
                </p>
              </div>
              <CopyLink id={id} />
              {/* Add PostActions for deleting the post itself */}
              <PostActions postId={data.id} postUserId={data.userId} currentUserId={user?.id} />
            </div>

            <CommentForm postId={id} />

            <Separator className="my-5" />

            <div className="flex flex-col gap-y-7">
              {data.comment.map((item) => (
                <CommentCard 
                  key={item.id} 
                  comment={item} 
                  currentUserId={user?.id} 
                />
              ))}
            </div>
          </div>
        </Card>
      </div>
      <div className="w-[30%]">
        <Card>
          <div className="bg-muted p-4 font-semibold">About Community</div>
          <div className="p-4">
            <div className="flex items-center gap-x-3">
              <Image
                src={`https://avatar.vercel.sh/${data?.subName}`}
                alt="Image of subpost"
                width={60}
                height={60}
                className="rounded-full h-16 w-16"
              />
              <Link href={`/p/${data?.subName}`} className="font-medium">
                bhub/{data?.subName}
              </Link>
            </div>

            <p className="text-sm font-normal text-secondary-foreground mt-3">
              {data?.Subpost?.description}
            </p>

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

            <Button asChild className="w-full mt-5">
              <Link href={`/p/${data.subName}/create`}>Create Post</Link>
            </Button>
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
              {[{
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
