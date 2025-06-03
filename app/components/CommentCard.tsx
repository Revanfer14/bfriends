"use client";

import { useEffect } from 'react';
import { useActionState } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import React from 'react'; // Import React for MouseEvent type
import { Button } from '@/components/ui/button';
import { deleteCommentAction } from '@/app/actions';
import { FormState } from '@/app/lib/definitions';
import { toast } from 'sonner';

interface User { 
  userName: string | null;
  imageUrl: string | null;
}

interface Comment {
  id: string;
  text: string;
  userId: string | null; // userId of the comment author
  User: User | null;
}

interface CommentCardProps {
  comment: Comment;
  currentUserId?: string | null; // ID of the currently logged-in user
}

const initialState: FormState = {
  message: "",
  status: "idle", // Changed from "" to "idle"
};

export function CommentCard({ comment, currentUserId }: CommentCardProps) {
  const [state, formAction, isPending] = useActionState(deleteCommentAction, initialState);

  useEffect(() => {
    if (state.status === "success" && state.message) {
      toast.success(state.message);
    } else if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state]);

  

  const defaultImage = "/pfp.png"; // Or your actual default placeholder image path

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-x-3">
        {comment.User?.userName ? (
          <Link href={`/profile/${comment.User.userName}`}>
            <img
              src={comment.User?.imageUrl || defaultImage}
              alt={`${comment.User.userName || 'User'}'s avatar`}
              className="w-7 h-7 rounded-full"
            />
          </Link>
        ) : (
          <img
            src={comment.User?.imageUrl || defaultImage}
            alt="User avatar"
            className="w-7 h-7 rounded-full"
          />
        )}
        <h3 className="text-sm font-medium">
          {comment.User?.userName ? (
            <Link href={`/profile/${comment.User.userName}`} className="hover:underline">
              {comment.User.userName}
            </Link>
          ) : (
            <span>{comment.User?.userName || 'Anonymous'}</span>
          )}
        </h3>
        {currentUserId && comment.userId && currentUserId === comment.userId && (
          <form action={formAction} className="ml-auto">
            <input type="hidden" name="commentId" value={comment.id} />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              disabled={isPending}
              aria-label="Delete comment"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                if (!window.confirm("Are you sure you want to delete this comment?")) {
                  e.preventDefault(); // Prevent form submission if not confirmed
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        )}
      </div>
      <p className="ml-10 text-secondary-foreground text-sm tracking-wide mt-1">
        {comment.text}
      </p>
    </div>
  );
}
