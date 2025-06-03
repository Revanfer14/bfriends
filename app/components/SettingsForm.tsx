"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { updateUserProfileAction, updateProfilePicture } from "../actions";
import { SubmitButton } from "./SubmitButtons";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { UserRoleType } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { campusList, customLinkSchema } from "../lib/definitions"; // Import campusList and customLinkSchema
import { z } from "zod";
import { toast } from "sonner";
import Image from "next/image";

// Define a type for the user profile prop based on what SettingsPage provides
interface UserProfileData {
  id: string;
  userName: string | null;
  email: string | null; 
  fullName: string | null;
  imageUrl: string | null;
  userPrimaryRole: UserRoleType | null;
  nim: string | null;
  studentMajor: string | null;
  studentBatch: string | null;
  employeeId: string | null;
  employeeDepartment: string | null;
  campusLocations: string[];
  bioDescription: string | null;
  occupationRole: string[];
  customLinks: z.infer<typeof customLinkSchema>[]; // Typed based on schema
  profileComplete: boolean;
}

// Using FormState directly from definitions for the main form action
import { FormState } from "../lib/definitions";

const initialUserProfileActionState: FormState = {
  message: "",
  status: "idle",
  errors: {},
  fieldValues: {},
};

const initialPictureActionState: FormState & { imageUrl?: string } = {
  message: "",
  status: "idle",
  errors: {},
  imageUrl: undefined,
};

const initialActionState: FormState = {
  message: "",
  status: "idle",
  errors: {},
  fieldValues: {},
};

export function SettingsForm({
  userProfile,
}: {
  userProfile: UserProfileData;
}) {
  const router = useRouter(); // Get router instance

  const [userProfileState, userProfileFormAction] = useActionState(updateUserProfileAction, initialUserProfileActionState);
  const [pictureState, pictureFormAction] = useActionState(updateProfilePicture, initialPictureActionState);
  const [previewUrl, setPreviewUrl] = useState<string | null>(userProfile.imageUrl);

  // Handlers for Occupation Roles
  const handleAddOccupationRole = () => setCurrentOccupationRoles([...currentOccupationRoles, '']);
  const handleRemoveOccupationRole = (index: number) => setCurrentOccupationRoles(currentOccupationRoles.filter((_, i) => i !== index));
  const handleOccupationRoleChange = (index: number, value: string) => {
    const newRoles = [...currentOccupationRoles];
    newRoles[index] = value;
    setCurrentOccupationRoles(newRoles);
  };

  // Handlers for Custom Links
  const handleAddCustomLink = () => setCurrentCustomLinks([...currentCustomLinks, { title: '', url: '' }]);
  const handleRemoveCustomLink = (index: number) => setCurrentCustomLinks(currentCustomLinks.filter((_, i) => i !== index));
  const handleCustomLinkChange = (index: number, field: 'title' | 'url', value: string) => {
    const newLinks = [...currentCustomLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setCurrentCustomLinks(newLinks);
  };
  const [selectedRole, setSelectedRole] = useState<UserRoleType | undefined>(userProfile.userPrimaryRole || undefined);
  const [selectedCampusLocations, setSelectedCampusLocations] = useState<string[]>(userProfile.campusLocations || []);
  const [currentStudentBatch, setCurrentStudentBatch] = useState<string>((userProfile.studentBatch?.startsWith('B-') ? userProfile.studentBatch.substring(2) : userProfile.studentBatch) || '');
  const [currentOccupationRoles, setCurrentOccupationRoles] = useState<string[]>(userProfile.occupationRole || []);
  const [currentCustomLinks, setCurrentCustomLinks] = useState<z.infer<typeof customLinkSchema>[]>(userProfile.customLinks || []);

  const scrollAndFocusToError = (errors: FormState['errors']) => {
    const fieldOrderToIds: { errorKey: string | RegExp, id: string | ((match: RegExpMatchArray | null) => string) }[] = [
      { errorKey: 'userName', id: 'userName' },
      { errorKey: 'fullName', id: 'fullName' },
      { errorKey: 'userPrimaryRole', id: 'userPrimaryRole-trigger' },
      { errorKey: 'nim', id: 'nim' },
      { errorKey: 'studentMajor', id: 'studentMajor' },
      { errorKey: 'studentBatch', id: 'studentBatch' },
      { errorKey: 'employeeId', id: 'employeeId' },
      { errorKey: 'employeeDepartment', id: 'employeeDepartment' },
      { errorKey: 'campusLocations', id: 'campusLocations-label' },
      { errorKey: 'bioDescription', id: 'bioDescription' },
      { errorKey: /^occupationRole\.([0-9]+)$/, id: (match) => `occupationRole-${match![1]}` },
      { errorKey: 'occupationRole', id: 'occupationRole-0' },
      { errorKey: /^customLinks\.([0-9]+)\.title$/, id: (match) => `customLink-title-${match![1]}` },
      { errorKey: /^customLinks\.([0-9]+)\.url$/, id: (match) => `customLink-url-${match![1]}` },
      { errorKey: 'customLinks', id: 'customLink-title-0' },
      { errorKey: '_form', id: 'settings-form-main' }
    ];

    let firstErrorFieldId: string | null = null;

    for (const { errorKey, id } of fieldOrderToIds) {
      if (typeof errorKey === 'string') {
        if (errors && errors[errorKey]) {
          firstErrorFieldId = id as string;
          break;
        }
      } else { // RegExp
        const foundKey = Object.keys(errors || {}).find(key => errorKey.test(key));
        if (foundKey) {
          const match = foundKey.match(errorKey);
          firstErrorFieldId = typeof id === 'function' ? id(match) : id as string;
          break;
        }
      }
    }

    if (firstErrorFieldId) {
      const element = document.getElementById(firstErrorFieldId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement || (element.getAttribute('role') === 'combobox' && element.hasAttribute('aria-haspopup'))) { // Check for SelectTrigger like elements
          element.focus({ preventScroll: true });
        }
      }
    }
  };

  // Effect for general user profile updates (excluding picture)
  useEffect(() => {
    if (userProfileState.status === 'success' && userProfileState.fieldValues) {
      if (userProfileState.fieldValues.userPrimaryRole) setSelectedRole(userProfileState.fieldValues.userPrimaryRole as UserRoleType);
      if (userProfileState.fieldValues.campusLocations) setSelectedCampusLocations(userProfileState.fieldValues.campusLocations as string[]);
      if (userProfileState.fieldValues.studentBatch) setCurrentStudentBatch(userProfileState.fieldValues.studentBatch as string);
      if (userProfileState.fieldValues.occupationRole) setCurrentOccupationRoles(userProfileState.fieldValues.occupationRole as string[]);
      if (userProfileState.fieldValues.customLinks) {
        const links = userProfileState.fieldValues.customLinks;
        if (typeof links === 'string') {
          try { setCurrentCustomLinks(JSON.parse(links)); } catch (e) { console.error('Failed to parse customLinks from action state', e); }
        } else if (Array.isArray(links)) {
          setCurrentCustomLinks(links);
        }
      }
    }
    if (userProfileState.status === 'success' && userProfileState.message) {
      toast.success('Profile updated successfully!');
    } else if (userProfileState.status === 'error' && userProfileState.message) {
      // Removed toast notification for error
      // Now, scroll to the first error.
      if (userProfileState.errors) {
        scrollAndFocusToError(userProfileState.errors);
      }
    }
  }, [userProfileState, router]);

  // Effect specifically for profile picture updates
  useEffect(() => {
    if (pictureState.status === 'success' && pictureState.message) {
      toast.success('Picture Updated!', { description: pictureState.message });
      if (pictureState.imageUrl) {
        setPreviewUrl(pictureState.imageUrl);
        router.refresh(); // Crucial for updating image across the app
      }
    } else if (pictureState.status === 'error' && pictureState.message) {
      const errorDescription = pictureState.errors?.profilePicture?.join('\n') || pictureState.errors?._form?.join('\n') ||
                               Object.values(pictureState.errors || {}).flat().filter(Boolean).join('\n');
      toast.error('Picture Update Failed', {
        description: pictureState.message + (errorDescription ? `\n${errorDescription}` : ''),
      });
    }
  }, [pictureState, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-extrabold tracking-tight">Settings</h1>
      <Separator className="my-4" />

      {/* The misplaced username block and erroneous closing form tag were removed here. The username field is now part of the main profile form below. */}

      {/* Form 1: Profile Picture Update */}
      <form action={pictureFormAction} className="space-y-4 border p-4 rounded-lg shadow-sm">
        <div>
          <Label htmlFor="profilePicture" className="text-lg">Profile Picture</Label>
          <p className="text-muted-foreground text-sm mb-1">
            You are able to change your profile picture here.
          </p>
          <div className="mt-2 flex items-center gap-4">
            <Image
              src={previewUrl || userProfile.imageUrl || "/default.png"}
              alt="Profile picture preview"
              width={80}
              height={80}
              className="rounded-full object-cover w-20 h-20"
            />
            <Input
              id="profilePicture"
              type="file"
              accept="image/*"
              name="profilePicture" // This name is used by updateProfilePicture action
              onChange={handleImageChange}
              className="max-w-xs"
            />
          </div>
          {pictureState.errors?.profilePicture && <p className="mt-1 text-sm text-red-500">{pictureState.errors.profilePicture.join(', ')}</p>}
          {/* General form errors for picture update, displayed below submit button */}
        </div>
        <SubmitButton text="Update Picture" />
        {pictureState.status === 'error' && pictureState.errors?._form && (
          <div className="mt-2 text-sm text-red-500">
            {pictureState.errors._form.map((error, index) => <p key={index}>{error}</p>)}
          </div>
        )}
        {/* Redundant specific _form error display removed as it's now handled above */}
      </form>

      <Separator className="my-6" />

      {/* Form 2: General Profile Information Update */}
      <form id="settings-form-main" action={userProfileFormAction} className="space-y-8 border p-4 rounded-lg shadow-sm">
        {/* Username Field - moved here */}
        <div>
          <Label htmlFor="userName" className="text-lg">Username</Label>
          <p className="text-muted-foreground text-sm mb-1">
            You are able to change your username here.
          </p>
          <Input
            id="userName"
            name="userName"
            defaultValue={userProfile.userName ?? ''}
            required
            className="mt-1"
            minLength={3}
            maxLength={30}
            pattern="^[a-zA-Z0-9_.]+$"
            title="Username can only contain letters, numbers, underscores, and periods."
          />
          {userProfileState.errors?.userName && <p className="mt-1 text-sm text-red-500">{userProfileState.errors.userName.join(', ')}</p>}
        </div>

        <div>
          <Label htmlFor="fullName" className="text-lg">Full Name</Label>
          <Input id="fullName" name="fullName" defaultValue={userProfile.fullName ?? ''} required className="mt-1" />
          {userProfileState.errors?.fullName && <p className="mt-1 text-sm text-red-500">{userProfileState.errors.fullName.join(', ')}</p>}
        </div>

        <div>
          <Label htmlFor="userPrimaryRole" className="text-lg">Primary Role</Label>
          <Select name="userPrimaryRole" value={selectedRole} onValueChange={(value: UserRoleType) => setSelectedRole(value)} required>
            <SelectTrigger id="userPrimaryRole-trigger" className="mt-1">
              <SelectValue placeholder="Select your primary role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UserRoleType.STUDENT}>Student</SelectItem>
              <SelectItem value={UserRoleType.EMPLOYEE}>Employee</SelectItem>
              <SelectItem value={UserRoleType.BOTH}>Both Student & Employee</SelectItem>
            </SelectContent>
          </Select>
          {userProfileState.errors?.userPrimaryRole && <p className="mt-1 text-sm text-red-500">{userProfileState.errors.userPrimaryRole.join(', ')}</p>}
        </div>

        {/* Conditional Fields based on selectedRole */}
        {(selectedRole === UserRoleType.STUDENT || selectedRole === UserRoleType.BOTH) && (
          <>
            <div>
              <Label htmlFor="nim">NIM (Nomor Induk Mahasiswa)</Label>
              <Input
                id="nim"
                name="nim"
                defaultValue={userProfile.nim ?? ''}
                required={selectedRole === UserRoleType.STUDENT || selectedRole === UserRoleType.BOTH}
                className="mt-1"
                pattern="^[0-9]+$"
                title="NIM must be numeric."
              />
              {userProfileState.errors?.nim && <p className="mt-1 text-sm text-red-500">{userProfileState.errors.nim.join(', ')}</p>}
            </div>
            <div>
              <Label htmlFor="studentMajor">Major</Label>
              <Input
                id="studentMajor"
                name="studentMajor"
                defaultValue={userProfile.studentMajor ?? ''}
                required={selectedRole === UserRoleType.STUDENT || selectedRole === UserRoleType.BOTH}
                className="mt-1"
              />
              {userProfileState.errors?.studentMajor && <p className="mt-1 text-sm text-red-500">{userProfileState.errors.studentMajor.join(', ')}</p>}
            </div>
            <div> {/* Batch Year Field Wrapper */}
              <Label htmlFor="studentBatch">Batch (Year)</Label>
              <div className="flex items-center mt-1"> {/* B Prefix + Input Wrapper */}
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm h-10">
                  B
                </span>
                <Input
                  id="studentBatch"
                  name="studentBatch"
                  value={currentStudentBatch}
                  onChange={(e) => setCurrentStudentBatch(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                  placeholder="25"
                  maxLength={2}
                  required={selectedRole === UserRoleType.STUDENT || selectedRole === UserRoleType.BOTH}
                  className="rounded-none rounded-r-md flex-1 min-w-0 w-full h-10"
                />
              </div> {/* End B Prefix + Input Wrapper */}
              {userProfileState.errors?.studentBatch && <p className="mt-1 text-sm text-red-500">{userProfileState.errors.studentBatch.join(', ')}</p>}
            </div> {/* End Batch Year Field Wrapper */}
          </>
        )}

        {(selectedRole === UserRoleType.EMPLOYEE || selectedRole === UserRoleType.BOTH) && (
          <>
            <div>
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                name="employeeId"
                defaultValue={userProfile.employeeId ?? ''}
                required={selectedRole === UserRoleType.EMPLOYEE || selectedRole === UserRoleType.BOTH}
                className="mt-1"
              />
              {userProfileState.errors?.employeeId && <p className="mt-1 text-sm text-red-500">{userProfileState.errors.employeeId.join(', ')}</p>}
            </div>
            <div>
              <Label htmlFor="employeeDepartment">Department</Label>
              <Input
                id="employeeDepartment"
                name="employeeDepartment"
                defaultValue={userProfile.employeeDepartment ?? ''}
                required={selectedRole === UserRoleType.EMPLOYEE || selectedRole === UserRoleType.BOTH}
                className="mt-1"
              />
              {userProfileState.errors?.employeeDepartment && <p className="mt-1 text-sm text-red-500">{userProfileState.errors.employeeDepartment.join(', ')}</p>}
            </div>
          </>
        )}

        <div>
          <Label id="campusLocations-label" className="text-base font-medium">Campus Locations</Label>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
            {campusList.map((campusName) => (
              <div key={campusName} className="flex items-center space-x-2">
                <Checkbox 
                  id={`campus-${campusName.replace(/@/g, '')}`}
                  name="campusLocations" 
                  value={campusName} 
                  checked={selectedCampusLocations.includes(campusName)}
                  onCheckedChange={(checked) => {
                    setSelectedCampusLocations(prev => 
                      checked ? [...prev, campusName] : prev.filter(loc => loc !== campusName)
                    );
                  }}
                />
                <Label htmlFor={`campus-${campusName.replace(/@/g, '')}`} className="font-normal">{campusName}</Label>
              </div>
            ))}
          </div>
          {userProfileState.errors?.campusLocations && <p className="mt-1 text-sm text-red-500">{userProfileState.errors.campusLocations.join(', ')}</p>}
        </div>

        <div>
          <Label htmlFor="bioDescription" className="text-lg">Bio</Label>
          <Textarea id="bioDescription" name="bioDescription" defaultValue={userProfile.bioDescription ?? ''} placeholder="Tell us a little about yourself..." className="mt-1 min-h-[100px]" />
          {userProfileState.errors?.bioDescription && <p className="mt-1 text-sm text-red-500">{userProfileState.errors.bioDescription.join(', ')}</p>}
        </div>

        {/* Occupation Roles */}
        <div>
          <Label className="text-lg">Occupation / Roles</Label>
          <p className="text-muted-foreground text-sm mb-1">List your current or past occupations or roles.</p>
          {currentOccupationRoles.map((role, index) => (
            <div key={index} className="flex items-center gap-2 mt-2">
              <Input 
                id={`occupationRole-${index}`}
                type="text"
                name={`occupationRole-${index}`}
                value={role}
                onChange={(e) => handleOccupationRoleChange(index, e.target.value)}
                placeholder="e.g., Software Engineer, Project Manager"
                className="flex-grow"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => handleRemoveOccupationRole(index)}>Remove</Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={handleAddOccupationRole} className="mt-2">Add Occupation</Button>
          {currentOccupationRoles.filter(role => role.trim() !== '').map((role, index) => (
            <input key={`hidden-occupation-${index}`} type="hidden" name="occupationRole" value={role} />
          ))}
          {userProfileState.errors?.occupationRole && Array.isArray(userProfileState.errors.occupationRole) && <p className="mt-1 text-sm text-red-500">{userProfileState.errors.occupationRole.join(', ')}</p>}
          {userProfileState.errors?.occupationRole && typeof userProfileState.errors.occupationRole === 'string' && <p className="mt-1 text-sm text-red-500">{userProfileState.errors.occupationRole}</p>}
        </div> {/* End of Occupation Roles Section */}

        {/* Custom Links */}
        <div>
          <Label className="text-lg">Custom Links</Label>
          <p className="text-muted-foreground text-sm mb-1">Add links to your portfolio, LinkedIn, GitHub, etc.</p>
          <input type="hidden" name="customLinks" value={JSON.stringify(currentCustomLinks.filter(link => link.title && link.url))} />
          {currentCustomLinks.map((link, index) => (
            <div key={index} className="mt-2 p-3 border rounded-md space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  id={`customLink-title-${index}`}
                  type="text"
                  name={`customLink-title-${index}`}
                  value={link.title}
                  onChange={(e) => handleCustomLinkChange(index, 'title', e.target.value)}
                  placeholder="Link Title (e.g., My Portfolio, LinkedIn)"
                  className="flex-grow"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => handleRemoveCustomLink(index)}>Remove</Button>
              </div>
              <Input
                id={`customLink-url-${index}`}
                type="url"
                name={`customLink-url-${index}`}
                value={link.url}
                onChange={(e) => handleCustomLinkChange(index, 'url', e.target.value)}
                placeholder="https://example.com"
                className="flex-grow"
              />
              {userProfileState.errors?.[`customLinks.${index}.title`] && <p className="mt-1 text-sm text-red-500">{userProfileState.errors[`customLinks.${index}.title`]?.join(', ')}</p>}
              {userProfileState.errors?.[`customLinks.${index}.url`] && <p className="mt-1 text-sm text-red-500">{userProfileState.errors[`customLinks.${index}.url`]?.join(', ')}</p>}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={handleAddCustomLink} className="mt-2">Add Link</Button>
          {/* General error for customLinks array itself, if any */}
          {userProfileState.errors?.customLinks && typeof userProfileState.errors.customLinks === 'string' && (
            <p className="mt-1 text-sm text-red-500">{userProfileState.errors.customLinks}</p>
          )}
          {userProfileState.errors?.customLinks && Array.isArray(userProfileState.errors.customLinks) && !userProfileState.errors.customLinks.some((err: any) => typeof err === 'object') && 
            <p className="mt-1 text-sm text-red-500">{(userProfileState.errors.customLinks as string[]).join(', ')}</p>}
        </div> {/* End of Custom Links Section */}

        {/* Form-level errors (e.g., _form from Zod refine) */}
        {userProfileState.status === 'error' && userProfileState.errors && userProfileState.errors._form && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <p className="font-semibold">Error updating profile:</p>
            <ul className="list-disc list-inside ml-4">
              {userProfileState.errors._form.map((error, index) => <li key={index}>{error}</li>)}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full flex mt-8 gap-x-5 justify-end">
          <Button variant="secondary" asChild type="button">
            <Link href="/">Cancel</Link>
          </Button>
          <SubmitButton text="Save Profile" />
        </div>
    </form>
    </div> // Closes the outer div
  );
}
