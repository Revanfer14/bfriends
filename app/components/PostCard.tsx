"use client";

import { Card } from "@/components/ui/card";
import { MessageCircle, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CopyLink } from "./CopyLink";
import { handleVote, deletePostAction } from "../actions";
import { useActionState, useEffect } from 'react'; // Or React.useActionState for React 19+
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormState } from '../lib/definitions';
import { DownVote, UpVote } from "./SubmitButtons";
import { RenderToJson } from "./RendertoJson";
import { JSONContent } from "@tiptap/react";
import { VoteType } from "@prisma/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AppProps {
  title: string;
  jsonContent: unknown;
  id: string; // This is the postId
  subName: string;
  userName: string;
  postUserId: string; // ID of the user who created the post
  imageString: string | null;
  voteCount: number;
  commentAmount: number;
  currentPath: string;
  userVote: VoteType | null;
  userImageUrl?: string | null;
  currentUserId?: string | null; // ID of the currently logged-in user
}

export function PostCard({
  title,
  jsonContent,
  id,
  subName,
  userName,
  imageString,
  voteCount,
  commentAmount,
  currentPath,
  userVote,
  userImageUrl,
  postUserId,
  currentUserId,
}: AppProps) {
  const initialDeleteState: FormState = { status: 'idle', message: '' };
  const [deleteState, submitDeleteAction, isDeletePending] = useActionState(deletePostAction, initialDeleteState);

  useEffect(() => {
    if (deleteState.status === 'success') {
      toast.success(deleteState.message);
      // Post removal will be handled by revalidation from the server action
    } else if (deleteState.status === 'error') {
      toast.error(deleteState.message);
    }
  }, [deleteState]);

  const handleDeleteConfirm = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      event.preventDefault(); // Prevent form submission if user cancels
    }
  };
  return (
    <Card className="flex flex-row relative overflow-hidden items-start">
      <div className="flex flex-col items-center gap-y-2 bg-muted p-2 h-full">
        <form action={handleVote}>
          <input type="hidden" name="voteDirection" value="UP" />
          <input type="hidden" name="postId" value={id} />
          <input type="hidden" name="path" value={currentPath} />
          <UpVote userVote={userVote} />
        </form>

        {/* Votes counter */}
        {voteCount}

        <form action={handleVote}>
          <input type="hidden" name="voteDirection" value="DOWN" />
          <input type="hidden" name="postId" value={id} />
          <input type="hidden" name="path" value={currentPath} />
          <DownVote userVote={userVote} />
        </form>
      </div>

      <div>
        <div className="flex items-center gap-x-2 p-2">
          <Link href={`/p/${subName}`} className="font-semibold text-xs">
            bhub/{subName}
          </Link>
          <div className="text-xs text-muted-foreground flex items-center">
            Posted by
            <Link href={`/profile/${userName}`} className="hover:text-primary hover:underline ml-1 flex items-center gap-x-1">
              <Avatar className="h-4 w-4 mr-1">
                <AvatarImage src={userImageUrl || undefined} alt={`${userName}'s avatar`} />
                <AvatarFallback>{userName ? userName.substring(0,1).toUpperCase() : 'U'}</AvatarFallback>
              </Avatar>
              {userName}
            </Link>
          </div>
        </div>

        <div className="px-2">
          <Link href={`/post/${id}`}>
            <h1 className="text-lg font-medium">{title}</h1>
          </Link>
        </div>

        <div className="max-h-[300px] overflow-hidden">
          {imageString ? (
            <Image
              src={imageString}
              alt="Post Image"
              width={600}
              height={300}
              className="w-full h-full"
            />
          ) : (
            <RenderToJson data={jsonContent as JSONContent} />
          )}
        </div>

        <div className="flex items-center gap-x-5 m-3">
          <div className="flex items-center gap-x-1">
            <Link href={`/post/${id}`} className="flex items-center gap-x-1">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              <p className="text-muted-foreground font-medium text-xs">
                {commentAmount} Comments
              </p>
            </Link>
          </div>

          <CopyLink id={id} />

          {currentUserId && currentUserId === postUserId && (
            <form action={submitDeleteAction}>
              <input type="hidden" name="postId" value={id} />
              <Button 
                type="submit" 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 p-1.5 text-muted-foreground hover:text-destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeletePending}
                aria-label="Delete post"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </Card>
  );
}
