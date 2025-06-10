'use client';

import { useEffect, useActionState } from 'react'; 
import { useFormStatus } from 'react-dom'; 
import { loginAction } from '@/app/actions';
import { FormState } from '@/app/lib/definitions'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';

const initialState: FormState = {
  status: 'idle',
  message: '',
  errors: {},
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" aria-disabled={pending} disabled={pending} className="w-full">
      {pending ? 'Signing In...' : 'Sign In'}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  useEffect(() => {
    if (state?.message) {
      if (state.status === 'error') {
        toast.error(state.message);
      } else {
        // For login, a success message might be redundant if redirecting immediately.
        // However, if there's a delay or a specific success message is needed:
        // toast.success(state.message);
        // Typically, successful login redirects, handled by the server action or page.
      }
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@binus.ac.id"
          required
          className="mt-1 block w-full"
        />
        {state?.errors?.email && (
          <p className="mt-1 text-sm text-red-500">{state.errors.email.join(', ')}</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          className="mt-1 block w-full"
        />
        {state?.errors?.password && (
          <p className="mt-1 text-sm text-red-500">{state.errors.password.join(', ')}</p>
        )}
      </div>

      <SubmitButton />

      {state?.message && (!state.errors || Object.keys(state.errors).length === 0) && state.status === 'error' && (
         <p className="text-center text-sm text-red-500">{state.message}</p>
      )}
    </form>
  );
}
