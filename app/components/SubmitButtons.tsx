"use client";

import { Button } from "@/components/ui/button";
import { VoteType } from "@prisma/client";
import { ArrowDown, ArrowUp, Loader2, Loader2Icon } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ text }: { text: string }) {
  const { pending } = useFormStatus();
  return (
    <>
      {pending ? (
        <Button disabled>
          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
          Loading
        </Button>
      ) : (
        <Button type="submit">{text}</Button>
      )}
    </>
  );
}

export function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <>
      {pending ? (
        <Button className="mt-4 w-full" disabled size="sm">
          <Loader2Icon className="mr-2 h-3 w-3 animate-spin" />
          Please wait
        </Button>
      ) : (
        <Button size="sm" className="mt-4 w-full" type="submit">
          Save
        </Button>
      )}
    </>
  );
}

interface VoteButtonProps {
  userVote?: VoteType | null;
}

export function UpVote({ userVote }: VoteButtonProps) {
  const { pending } = useFormStatus();
  return (
    <>
      {pending ? (
        <Button variant="outline" size="sm" disabled>
          <Loader2 className="h-4 w-4 animate-spin" />
        </Button>
      ) : (
        <Button variant="outline" size="sm" type="submit" className={userVote === 'UP' ? 'text-primary border-primary' : ''}>
          <ArrowUp className={`w-4 h-4 ${userVote === 'UP' ? 'fill-primary' : ''}`} />
        </Button>
      )}
    </>
  );
}

export function DownVote({ userVote }: VoteButtonProps) {
  const { pending } = useFormStatus();
  return (
    <>
      {pending ? (
        <Button variant="outline" size="sm" disabled>
          <Loader2 className="h-4 w-4 animate-spin" />
        </Button>
      ) : (
        <Button variant="outline" size="sm" type="submit" className={userVote === 'DOWN' ? 'text-destructive border-destructive' : ''}>
          <ArrowDown className={`w-4 h-4 ${userVote === 'DOWN' ? 'fill-destructive' : ''}`} />
        </Button>
      )}
    </>
  );
}
