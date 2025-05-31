'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { loginAction, LoginFormState } from '@/app/actions'; // We will define this action and state type
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';

const initialState: LoginFormState = {
  message: '',
  error: false,
  fieldErrors: {},
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
  const [state, formAction] = useFormState(loginAction, initialState);

  useEffect(() => {
    if (state?.message) {
      if (state.error) {
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
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@binus.ac.id"
          required
          className="mt-1 block w-full"
        />
        {state?.fieldErrors?.email && (
          <p className="mt-1 text-sm text-red-500">{state.fieldErrors.email.join(', ')}</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          {/* Optional: Add Forgot Password link */}
          {/* <div className="text-sm">
            <Link href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
              Forgot your password?
            </Link>
          </div> */}
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
        {state?.fieldErrors?.password && (
          <p className="mt-1 text-sm text-red-500">{state.fieldErrors.password.join(', ')}</p>
        )}
      </div>

      <SubmitButton />

      {state?.message && !state.fieldErrors && state.error && (
         <p className="text-center text-sm text-red-500">{state.message}</p>
      )}
    </form>
  );
}
