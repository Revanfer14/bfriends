'use client';

import { useEffect, useState, useMemo } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { completeOnboardingAction } from '../../actions';
import { FormState, UserRoleType, campusList, customLinkSchema } from '../../lib/definitions';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Using path alias
import { Checkbox } from "@/components/ui/checkbox"; // Using path alias
import { toast } from 'sonner';
import { z } from 'zod';

interface OnboardingFormProps {
  initialData?: {
    email?: string;
    fullName?: string | null;
    userName?: string | null;
    userPrimaryRole?: UserRoleType | null;
    nim?: string | null;
    studentMajor?: string | null;
    studentBatch?: string | null;
    employeeId?: string | null;
    employeeDepartment?: string | null;
    campusLocations?: string[] | null;
    bioDescription?: string | null;
    occupationRole?: string[] | null;
    customLinks?: string | null; // Assuming customLinks is passed as a JSON string
  };
}

const initialFormState: FormState = {
  status: 'idle',
  message: '',
  errors: {},
  fieldValues: {},
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" aria-disabled={pending} disabled={pending} className="w-full mt-8">
      {pending ? 'Completing Profile...' : 'Complete Profile'}
    </Button>
  );
}

export function OnboardingForm({ initialData }: OnboardingFormProps) {
  const [state, formAction] = useActionState(completeOnboardingAction, initialFormState);
  const [selectedRole, setSelectedRole] = useState<UserRoleType | undefined>(
    state.fieldValues?.userPrimaryRole as UserRoleType || initialData?.userPrimaryRole || undefined
  );
  const [currentCustomLinks, setCurrentCustomLinks] = useState<z.infer<typeof customLinkSchema>[]>(
    state.fieldValues?.customLinks ?? (initialData?.customLinks ? (typeof initialData.customLinks === 'string' ? JSON.parse(initialData.customLinks) : initialData.customLinks) : []) ?? []
  );
  const [currentOccupationRoles, setCurrentOccupationRoles] = useState<string[]>(
    state.fieldValues?.occupationRole ?? initialData?.occupationRole ?? []
  );

  useEffect(() => {
    if (state.status === 'success') {
      toast.success(state.message);
    } else if (state.status === 'error' && state.message) {
      const errorDescription = state.errors?._form?.join('\n') || 
                               Object.values(state.errors || {}).flat().filter(Boolean).join('\n');
      toast.error(state.message, {
        description: errorDescription || 'Please review the form for errors.',
      });
    }
    if (state.fieldValues?.userPrimaryRole) {
      setSelectedRole(state.fieldValues.userPrimaryRole as UserRoleType);
    }
    if (state.fieldValues?.customLinks && Array.isArray(state.fieldValues.customLinks)) {
      setCurrentCustomLinks(state.fieldValues.customLinks);
    }
    if (state.fieldValues?.occupationRole && Array.isArray(state.fieldValues.occupationRole)) {
      setCurrentOccupationRoles(state.fieldValues.occupationRole);
    }
  }, [state]);

  const defaultValues = useMemo(() => ({
    fullName: state.fieldValues?.fullName ?? initialData?.fullName ?? '',
    userName: state.fieldValues?.userName ?? initialData?.userName ?? '',
    userPrimaryRole: selectedRole,
    nim: state.fieldValues?.nim ?? initialData?.nim ?? '',
    studentMajor: state.fieldValues?.studentMajor ?? initialData?.studentMajor ?? '',
    studentBatch: state.fieldValues?.studentBatch ?? initialData?.studentBatch ?? '',
    employeeId: state.fieldValues?.employeeId ?? initialData?.employeeId ?? '',
    employeeDepartment: state.fieldValues?.employeeDepartment ?? initialData?.employeeDepartment ?? '',
    campusLocations: state.fieldValues?.campusLocations ?? initialData?.campusLocations ?? [],
    bioDescription: state.fieldValues?.bioDescription ?? initialData?.bioDescription ?? '',
    occupationRole: state.fieldValues?.occupationRole ?? initialData?.occupationRole ?? [],
    customLinks: state.fieldValues?.customLinks ?? (initialData?.customLinks ? (typeof initialData.customLinks === 'string' ? JSON.parse(initialData.customLinks) : initialData.customLinks) : []) ?? [],
  }), [state.fieldValues, initialData, selectedRole]);

  const handleAddCustomLink = () => {
    setCurrentCustomLinks([...currentCustomLinks, { title: '', url: '' }]);
  };

  const handleRemoveCustomLink = (index: number) => {
    setCurrentCustomLinks(currentCustomLinks.filter((_, i) => i !== index));
  };

  const handleCustomLinkChange = (index: number, field: 'title' | 'url', value: string) => {
    const newLinks = [...currentCustomLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setCurrentCustomLinks(newLinks);
  };

  const handleAddOccupationRole = () => {
    setCurrentOccupationRoles([...currentOccupationRoles, '']);
  };

  const handleRemoveOccupationRole = (index: number) => {
    setCurrentOccupationRoles(currentOccupationRoles.filter((_, i) => i !== index));
  };

  const handleOccupationRoleChange = (index: number, value: string) => {
    const newRoles = [...currentOccupationRoles];
    newRoles[index] = value;
    setCurrentOccupationRoles(newRoles);
  };

  return (
    <form action={formAction} className="space-y-6 py-4">
      <input type="hidden" name="customLinks" value={JSON.stringify(currentCustomLinks.filter(link => link.title && link.url))} />
      {/* Hidden inputs for occupationRole array items */}
      {currentOccupationRoles.filter(role => role.trim() !== '').map((role, index) => (
        <input key={`hidden-occupation-${index}`} type="hidden" name="occupationRole" value={role} />
      ))}

      <div>
        <Label htmlFor="userName">Username <span className="text-red-500">*</span></Label>
        <Input id="userName" name="userName" defaultValue={defaultValues.userName} required className="mt-1" minLength={3} maxLength={30} pattern="^[a-zA-Z0-9_.]+$" title="Username can only contain letters, numbers, underscores, and periods." />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">3-30 characters. Letters, numbers, underscores, periods.</p>
        {state.errors?.userName && <p className="mt-1 text-sm text-red-500">{state.errors.userName.join(', ')}</p>}
      </div>

      <div>
        <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
        <Input id="fullName" name="fullName" defaultValue={state.fieldValues?.fullName || ''} required className="mt-1" />
        {state.errors?.fullName && <p className="mt-1 text-sm text-red-500">{state.errors.fullName.join(', ')}</p>}
      </div>

      <div>
        <Label htmlFor="userPrimaryRole">Primary Role <span className="text-red-500">*</span></Label>
        <Select name="userPrimaryRole" required value={selectedRole} onValueChange={(value: UserRoleType) => setSelectedRole(value)}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select your primary role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UserRoleType.STUDENT}>Student</SelectItem>
            <SelectItem value={UserRoleType.EMPLOYEE}>Employee</SelectItem>
            <SelectItem value={UserRoleType.BOTH}>Both Student & Employee</SelectItem>
          </SelectContent>
        </Select>
        {state.errors?.userPrimaryRole && <p className="mt-1 text-sm text-red-500">{state.errors.userPrimaryRole.join(', ')}</p>}
      </div>

      {(selectedRole === UserRoleType.STUDENT || selectedRole === UserRoleType.BOTH) && (
        <>
          <div>
            <Label htmlFor="nim">NIM (Nomor Induk Mahasiswa) <span className="text-red-500">*</span></Label>
            <Input id="nim" name="nim" defaultValue={defaultValues.nim} required={selectedRole === UserRoleType.STUDENT || selectedRole === UserRoleType.BOTH} className="mt-1" />
            {state.errors?.nim && <p className="mt-1 text-sm text-red-500">{state.errors.nim.join(', ')}</p>}
          </div>
          <div>
            <Label htmlFor="studentMajor">Major <span className="text-red-500">*</span></Label>
            <Input id="studentMajor" name="studentMajor" defaultValue={defaultValues.studentMajor} required={selectedRole === UserRoleType.STUDENT || selectedRole === UserRoleType.BOTH} className="mt-1" />
            {state.errors?.studentMajor && <p className="mt-1 text-sm text-red-500">{state.errors.studentMajor.join(', ')}</p>}
          </div>
<div>
            <Label htmlFor="studentBatch_input">Batch <span className="text-red-500">*</span></Label>
            <div className="flex items-center mt-1">
              <span className="mr-2 bg-gray-100 dark:bg-gray-700 p-2 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600">B</span>
              <Input
                id="studentBatch_input"
                name="studentBatch_input" // Use a temporary name for UI input
                defaultValue={defaultValues.studentBatch} // Use defaultValues from useMemo
                maxLength={2}
                placeholder="YY"
                pattern="\d{2}"
                title="Enter 2 digits for batch (e.g., 25)"
                className="rounded-l-none"
                required={selectedRole === UserRoleType.STUDENT || selectedRole === UserRoleType.BOTH}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                  e.target.value = value;
                  const hiddenInput = document.getElementById('studentBatch') as HTMLInputElement | null;
                  if (hiddenInput) hiddenInput.value = value;
                }}
              />
            </div>
            {/* Hidden input to store the actual 2-digit value for the form, default value will be set by the visible input's onChange or by initialData if available */}
            <input type="hidden" id="studentBatch" name="studentBatch" defaultValue={defaultValues.studentBatch} />
            {state.errors?.studentBatch && <p className="mt-1 text-sm text-red-500">{state.errors.studentBatch.join(', ')}</p>}
          </div>
        </>
      )}

      {(selectedRole === UserRoleType.EMPLOYEE || selectedRole === UserRoleType.BOTH) && (
        <>
          <div>
            <Label htmlFor="employeeId">Employee ID (NIK Karyawan) <span className="text-red-500">*</span></Label>
            <Input id="employeeId" name="employeeId" defaultValue={defaultValues.employeeId} required={selectedRole === UserRoleType.EMPLOYEE || selectedRole === UserRoleType.BOTH} className="mt-1" />
            {state.errors?.employeeId && <p className="mt-1 text-sm text-red-500">{state.errors.employeeId.join(', ')}</p>}
          </div>
          <div>
            <Label htmlFor="employeeDepartment">Department <span className="text-red-500">*</span></Label>
            <Input id="employeeDepartment" name="employeeDepartment" defaultValue={defaultValues.employeeDepartment} required={selectedRole === UserRoleType.EMPLOYEE || selectedRole === UserRoleType.BOTH} className="mt-1" />
            {state.errors?.employeeDepartment && <p className="mt-1 text-sm text-red-500">{state.errors.employeeDepartment.join(', ')}</p>}
          </div>
        </>
      )}

      <div>
        <Label>Campus Locations <span className="text-red-500">*</span></Label>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {campusList.map((campus: typeof campusList[number]) => (
            <div key={campus} className="flex items-center space-x-2">
              <Checkbox 
                id={`campus-${campus}`} 
                name="campusLocations" 
                value={campus} 
                defaultChecked={Array.isArray(defaultValues.campusLocations) && defaultValues.campusLocations.includes(campus)}
              />
              <Label htmlFor={`campus-${campus}`} className="font-normal">{campus}</Label>
            </div>
          ))}
        </div>
        {state.errors?.campusLocations && <p className="mt-1 text-sm text-red-500">{Array.isArray(state.errors.campusLocations) ? state.errors.campusLocations.join(', ') : state.errors.campusLocations}</p>}
      </div>

      <div>
        <Label htmlFor="bioDescription">Bio / Description (Optional)</Label>
        <Textarea id="bioDescription" name="bioDescription" defaultValue={defaultValues.bioDescription} className="mt-1" rows={3} maxLength={500} />
        {state.errors?.bioDescription && <p className="mt-1 text-sm text-red-500">{state.errors.bioDescription.join(', ')}</p>}
      </div>

      <div>
        <Label>Occupation / Role(s) (Optional)</Label>
        {currentOccupationRoles.map((role, index) => (
          <div key={index} className="flex items-center space-x-2 mt-1">
            <Input 
              value={role} 
              onChange={(e) => handleOccupationRoleChange(index, e.target.value)} 
              placeholder="e.g., Student, Developer" 
              className="flex-grow"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => handleRemoveOccupationRole(index)} aria-label="Remove role">
              X
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={handleAddOccupationRole} className="mt-2">
          + Add Occupation Role
        </Button>
        {state.errors?.occupationRole && <p className="mt-1 text-sm text-red-500">{Array.isArray(state.errors.occupationRole) ? state.errors.occupationRole.join(', ') : state.errors.occupationRole}</p>}
      </div>

      <div>
        <Label>Custom Links (Optional)</Label>
        {currentCustomLinks.map((link, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 mt-2 items-center">
            <Input 
              value={link.title} 
              onChange={(e) => handleCustomLinkChange(index, 'title', e.target.value)} 
              placeholder="Link Title (e.g., GitHub)" 
            />
            <Input 
              value={link.url} 
              onChange={(e) => handleCustomLinkChange(index, 'url', e.target.value)} 
              placeholder="URL (e.g., https://github.com/username)" 
              type="url"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => handleRemoveCustomLink(index)} aria-label="Remove link">
              X
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={handleAddCustomLink} className="mt-2">
          + Add Custom Link
        </Button>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Provide a title and a valid URL for each link.</p>
        {state.errors?.customLinks && (
            typeof state.errors.customLinks === 'string' ? <p className="mt-1 text-sm text-red-500">{state.errors.customLinks}</p> :
            Array.isArray(state.errors.customLinks) ? (
                state.errors.customLinks.map((errMsg: string, idx: number) => (<p key={`cl-err-${idx}`} className="mt-1 text-sm text-red-500">{typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg)}</p>))
            ) : (
                 typeof state.errors.customLinks === 'object' && Object.entries(state.errors.customLinks as Record<string, any>).map(([itemIndex, fieldError]: [string, any], idx: number) => (
                    <div key={`cl-item-err-${idx}`} className="mt-1 text-sm text-red-500">
                        <p>Link {parseInt(itemIndex)+1}:</p>
                        {fieldError.title && <p className="ml-2">- Title: {fieldError.title.join(', ')}</p>}
{fieldError.url && <p className="ml-2">- URL: {fieldError.url.join(', ')}</p>}
                    </div>
                ))
            )
        )}
      </div>
      
      {state.status === 'error' && state.message && state.errors?._form && (
         <p className="text-center text-sm text-red-500 py-2">{state.errors._form.join(', ')}</p>
      )}

      <SubmitButton />
    </form>
  );
}
