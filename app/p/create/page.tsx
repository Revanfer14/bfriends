"use client";

import { createCommunity as serverCreateCommunity } from "@/app/actions";
import { SubmitButton } from "@/app/components/SubmitButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from "react";
import { type FormState } from '@/app/lib/definitions';
import { toast } from "sonner";



export default function SubpostPage() {
  const router = useRouter();
  const [state, formAction] = useActionState(
    serverCreateCommunity as (prevState: FormState, formData: FormData) => Promise<FormState>,
    {
      message: "",
      status: 'idle' as const,
      errors: undefined,
      fieldValues: undefined,
      redirectTo: undefined,
    } satisfies FormState
  );

  useEffect(() => {
    if (state.status === "error" && state.message) {
      toast.error("Error Creating Community", {
        description: state.message,
      });
    } else if (state.status === "success" && state.message) {
      toast.success("Community Created", {
        description: state.message,
      });
      if (state.redirectTo) {
        router.push(state.redirectTo);
      }
    }
  }, [state, router]);

  return (
    <div className="max-w-[1000px] mx-auto flex flex-col mt-4">
      <form action={formAction}>
        <h1 className="text-3xl font-bold tracking-tight">Create Community</h1>
        <Separator className="my-4" />
        <Label className="text-lg">Name</Label>
        <p className="text-muted-foreground">
          Community names including capitalization cannot be changed!
        </p>

        <div className="relative mt-3">
          <p className="absolute left-0 w-12 flex items-center justify-center h-full text-muted-foreground">
            bhub/
          </p>
          <Input
            name="name"
            required
            className="pl-14"
            minLength={2}
            maxLength={30}
            onInput={(e) => {
              const input = e.target as HTMLInputElement;
              input.value = input.value.replace(/\s/g, "");
            }}
          />
        </div>

        {state.status === 'error' && state.message && (!state.errors || !state.errors.name) && (
          <p className="mt-1 text-sm text-red-500">{state.message}</p>
        )}
        {state.errors?.name && (
          <p className="mt-1 text-sm text-red-500">{state.errors.name.join(', ')}</p>
        )}
        {state.errors?._form && (
          <p className="mt-1 text-sm text-red-500">{state.errors._form.join(', ')}</p>
        )}

        <div className="w-full flex mt-4 gap-x-3 justify-end">
          <Button variant="secondary" asChild>
            <Link href="/">Cancel</Link>
          </Button>
          <SubmitButton text="Submit" />
        </div>
      </form>
    </div>
  );
}
