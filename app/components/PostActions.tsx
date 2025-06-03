"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deletePostAction } from '@/app/actions';
import { FormState } from '@/app/lib/definitions';
import { toast } from 'sonner';

interface PostActionsProps {
  postId: string;
  postUserId: string | null;
  currentUserId?: string | null;
}

const initialState: FormState = {
  message: "",
  status: "idle",
};

export function PostActions({ postId, postUserId, currentUserId }: PostActionsProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(deletePostAction, initialState);

  useEffect(() => {
    console.log('PostActions useEffect triggered. State:', state, 'isPending:', isPending);

    // Only handle errors here, success is handled by server-side redirect
    if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state]); // Only depends on state now

  if (!currentUserId || !postUserId || currentUserId !== postUserId) {
    return null; // Don't render anything if the user is not the author
  }

  return (
    <form action={formAction} className="ml-auto">
      <input type="hidden" name="postId" value={postId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        disabled={isPending}
        aria-label="Delete post"
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          if (!window.confirm("Are you sure you want to delete this post?")) {
            e.preventDefault(); // Prevent form submission if not confirmed
          } else {
            // Optimistic toast, server will handle redirect on success
            toast.info("Deleting post...");
          }
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </form>
  );
}
