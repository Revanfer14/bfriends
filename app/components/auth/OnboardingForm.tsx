'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateUserProfileAction, type OnboardingFormState } from '../../actions';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';

interface OnboardingFormProps {
  userId: string;
  initialData: {
    id: string;
    userName: string | null;
    fullName: string | null;
    universityId: string | null;
    departmentMajor: string | null;
    bioDescription: string | null;
    occupationRole: string[]; // Already an array from page.tsx pre-processing
    batch: string | null;
    customLinks: string; // Stringified JSON from page.tsx
    profileComplete: boolean;
  };
}

const initialState: OnboardingFormState = {
  message: '',
  error: false,
  fieldErrors: {},
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" aria-disabled={pending} disabled={pending} className="w-full mt-6">
      {pending ? 'Saving Profile...' : 'Save Profile'}
    </Button>
  );
}

export function OnboardingForm({ userId, initialData }: OnboardingFormProps) {
  // The updateUserProfileAction doesn't use prevState to populate the form,
  // so we bind initialData directly to the form fields or use it for defaultValues.
  // For useFormState, the initial state is for the action's return value, not form field values.
  const [state, formAction] = useFormState(updateUserProfileAction, initialState);

  useEffect(() => {
    if (state?.message) {
      if (state.error) {
        toast.error(state.message);
      } else {
        // Success message handled by redirect in action, but can show toast if needed.
        // toast.success(state.message);
      }
    }
  }, [state]);

  // Memoize default values to prevent re-renders if initialData object reference changes unnecessarily
  const defaultValues = useMemo(() => ({
    fullName: initialData.fullName || '',
    universityId: initialData.universityId || '',
    departmentMajor: initialData.departmentMajor || '',
    batch: initialData.batch || '',
    bioDescription: initialData.bioDescription || '',
    occupationRole: initialData.occupationRole.join(', ') || '', // Convert array to comma-separated string for input
    customLinks: initialData.customLinks || '', // Already stringified JSON
  }), [initialData]);

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden input for userId if needed by action, though action gets it from session */}
      {/* <input type="hidden" name="userId" value={userId} /> */}

      <div>
        <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
        <Input id="fullName" name="fullName" defaultValue={defaultValues.fullName} required className="mt-1" />
        {state?.fieldErrors?.fullName && <p className="mt-1 text-sm text-red-500">{state.fieldErrors.fullName.join(', ')}</p>}
      </div>

      <div>
        <Label htmlFor="universityId">University ID (NIM/BINUS ID) <span className="text-red-500">*</span></Label>
        <Input id="universityId" name="universityId" defaultValue={defaultValues.universityId} required className="mt-1" />
        {state?.fieldErrors?.universityId && <p className="mt-1 text-sm text-red-500">{state.fieldErrors.universityId.join(', ')}</p>}
      </div>

      <div>
        <Label htmlFor="departmentMajor">Department / Major <span className="text-red-500">*</span></Label>
        <Input id="departmentMajor" name="departmentMajor" defaultValue={defaultValues.departmentMajor} required className="mt-1" />
        {state?.fieldErrors?.departmentMajor && <p className="mt-1 text-sm text-red-500">{state.fieldErrors.departmentMajor.join(', ')}</p>}
      </div>

      <div>
        <Label htmlFor="batch">Batch (e.g., 2025) <span className="text-red-500">*</span></Label>
        <Input id="batch" name="batch" defaultValue={defaultValues.batch} required className="mt-1" placeholder="YYYY" />
        {state?.fieldErrors?.batch && <p className="mt-1 text-sm text-red-500">{state.fieldErrors.batch.join(', ')}</p>}
      </div>

      <div>
        <Label htmlFor="bioDescription">Bio / Description (Optional)</Label>
        <Textarea id="bioDescription" name="bioDescription" defaultValue={defaultValues.bioDescription} className="mt-1" rows={3} />
        {state?.fieldErrors?.bioDescription && <p className="mt-1 text-sm text-red-500">{state.fieldErrors.bioDescription.join(', ')}</p>}
      </div>

      <div>
        <Label htmlFor="occupationRole">Occupation / Role(s) (Optional, comma-separated)</Label>
        <Input id="occupationRole" name="occupationRole" defaultValue={defaultValues.occupationRole} className="mt-1" placeholder="e.g., Student, Developer, Designer" />
        {state?.fieldErrors?.occupationRole && <p className="mt-1 text-sm text-red-500">{state.fieldErrors.occupationRole.join(', ')}</p>}
      </div>

      <div>
        <Label htmlFor="customLinks">Custom Links (Optional, JSON format)</Label>
        <Textarea 
            id="customLinks" 
            name="customLinks" 
            defaultValue={defaultValues.customLinks} 
            className="mt-1" 
            rows={3} 
            placeholder='e.g., { "github": "https://github.com/yourusername", "linkedin": "https://linkedin.com/in/yourprofile" }'
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Enter as a valid JSON object string.</p>
        {state?.fieldErrors?.customLinks && <p className="mt-1 text-sm text-red-500">{state.fieldErrors.customLinks.join(', ')}</p>}
      </div>
      
      {state?.message && !state.fieldErrors && state.error && (
         <p className="text-center text-sm text-red-500 py-2">{state.message}</p>
      )}

      <SubmitButton />
    </form>
  );
}
