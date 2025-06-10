'use client';

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signUpAction } from "@/app/actions";
import { FormState } from '@/app/lib/definitions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect } from 'react';
import { toast } from 'sonner';

const initialState: FormState = {
  status: 'idle',
  message: "",
  errors: {},
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
  const [state, formAction] = useActionState(signUpAction, initialState);
  

  useEffect(() => {
    if (state?.message) {
      if (state.status === 'error') {
        toast.error(state.message);
      } else {
        if (!state.errors || Object.keys(state.errors).length === 0) {
            toast.success(state.message);
        }
      }
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="name@binus.ac.id" className="mt-1 block w-full" required />
        {state?.errors?.email && (
          <p className="text-sm text-red-500 mt-1">{state.errors.email.join(', ')}</p>
        )}
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required minLength={6} className="mt-1 block w-full" />
        {state?.errors?.password && (
          <p className="text-sm text-red-500 mt-1">{state.errors.password.join(', ')}</p>
        )}
      </div>
      <SubmitButton />
      {state?.message && (!state.errors || Object.keys(state.errors).length === 0) && state.status === 'success' && (
        <p className="text-sm text-green-600 mt-1">{state.message}</p>
      )}
      {state?.message && (!state.errors || Object.keys(state.errors).length === 0) && state.status === 'error' && (
         <p className="text-sm text-red-500 mt-1">{state.message}</p>
      )}
    </form>
  );
}
