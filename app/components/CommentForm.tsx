"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "./SubmitButtons";
import { createComment } from "../actions";
import { useRef } from "react";

interface AppProps {
  postId: string;
}

export function CommentForm({ postId }: AppProps) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      className="mt-5"
      action={async (formData) => {
        await createComment(formData);
        ref.current?.reset();
      }}
      ref={ref}
    >
      <input type="hidden" name="postId" value={postId} />
      <Label>Comment right here</Label>
      <Textarea
        placeholder="Please be polite"
        className="w-full mt-2 mb-2"
        name="comment"
      />
      <SubmitButton text="Comment" />
    </form>
  );
}
