'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { signUpAction, SignUpFormState } from "@/app/actions"; // We will define this action next
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect } from 'react';
import { toast } from 'sonner';

const initialState: SignUpFormState = {
  message: "",
  error: false,
  fieldErrors: {},
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" aria-disabled={pending} disabled={pending} className="w-full">
      {pending ? 'Signing Up...' : 'Sign Up'}
    </Button>
  );
}

export function SignUpForm() {
  const [state, formAction] = useFormState(signUpAction, initialState);
  

  useEffect(() => {
    if (state?.message) {
      if (state.error) {
        toast.error(state.message);
      } else {
        // Check if there are no field errors before showing a general success message
        // This prevents showing a general success toast if there were specific field validation successes
        // that aren't meant to be global success messages.
        // However, for signup, a general success message is usually fine.
        if (!state.fieldErrors || Object.keys(state.fieldErrors).length === 0) {
            toast.success(state.message);
        }
      }
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="name@binus.ac.id" required />
        {state?.fieldErrors?.email && (
          <p className="text-sm text-red-500 mt-1">{state.fieldErrors.email}</p>
        )}
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required minLength={6} />
        {state?.fieldErrors?.password && (
          <p className="text-sm text-red-500 mt-1">{state.fieldErrors.password}</p>
        )}
      </div>
      <SubmitButton />
      {state?.message && !state.fieldErrors && !state.error && (
        <p className="text-sm text-green-600 mt-1">{state.message}</p>
      )}
      {state?.message && !state.fieldErrors && state.error && (
         <p className="text-sm text-red-500 mt-1">{state.message}</p>
      )}
    </form>
  );
}
