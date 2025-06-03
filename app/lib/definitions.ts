// app/lib/definitions.ts
import { z } from 'zod';
import { UserRoleType } from '@prisma/client';

// Re-export UserRoleType for convenience
export { UserRoleType };

// General Form State Type
export type FormState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  errors?: Record<string, string[] | undefined> & { _form?: string[] };
  fieldValues?: Record<string, any>;
  redirectTo?: string;
};

// Campus List Constant
export const campusList = [
  '@Kemanggisan', '@Alam Sutera', '@Bekasi', '@Bandung', '@Malang', '@Semarang', '@Senayan', '@Medan', '@BASE Alam Sutera'
] as const;

// Custom Link Schema
export const customLinkSchema = z.object({
  title: z.string().min(1, 'Link title is required.').max(50, 'Link title too long.'),
  url: z.string().url('Must be a valid URL.').max(2048, 'URL too long.'),
});
export type CustomLink = z.infer<typeof customLinkSchema>;

// User Profile Form Schema
const userProfileFormSchemaBase = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters.').max(100, 'Full name too long.'),
  userName: z.string().min(3, 'Username must be at least 3 characters.').max(30, 'Username too long.')
    .regex(/^[a-zA-Z0-9_.]+$/, 'Username can only contain letters, numbers, underscores, and periods.')
    .trim(),
  userPrimaryRole: z.nativeEnum(UserRoleType, { required_error: 'Primary role is required.' }),
  nim: z.string().max(20, 'NIM too long.').optional(),
  studentMajor: z.string().max(100, 'Major too long.').optional(),
  studentBatch: z.string().regex(/^\d{2}$/, 'Batch must be 2 digits (e.g., 25 for B25)').optional(),
  employeeId: z.string().max(20, 'Employee ID too long.').optional(),
  employeeDepartment: z.string().max(100, 'Department too long.').optional(),
  campusLocations: z.array(z.enum(campusList)).min(1, "Please select at least one campus location.").optional().default([]),
  bioDescription: z.string().max(500, 'Bio description too long.').optional().default(''),
  occupationRole: z.array(z.string().min(1, 'Occupation role cannot be empty.').max(50, 'Occupation role too long.')).optional().default([]),
  customLinks: z.preprocess(
    (val: unknown) => {
      if (typeof val === 'string' && val.trim() !== '') {
        try { return JSON.parse(val); } catch { return []; }
      }
      return Array.isArray(val) ? val : [];
    },
    z.array(customLinkSchema).optional().default([])
  ),
});

export const userProfileFormSchema = userProfileFormSchemaBase.superRefine((data, ctx) => {
  if (!data.userName || data.userName.trim() === "") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['userName'], message: 'Username is required and cannot be empty.' });
  }
  const isStudent = data.userPrimaryRole === UserRoleType.STUDENT || data.userPrimaryRole === UserRoleType.BOTH;
  const isEmployee = data.userPrimaryRole === UserRoleType.EMPLOYEE || data.userPrimaryRole === UserRoleType.BOTH;

  if (isStudent) {
    if (!data.nim?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nim'], message: 'NIM is required for students.' });
    if (!data.studentMajor?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['studentMajor'], message: 'Major is required for students.' });
    if (!data.studentBatch?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['studentBatch'], message: 'Batch (YY) is required for students.' });
  }
  if (isEmployee) {
    if (!data.employeeId?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['employeeId'], message: 'Employee ID is required for employees.' });
    if (!data.employeeDepartment?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['employeeDepartment'], message: 'Department is required for employees.' });
  }
});
export type UserProfileData = z.infer<typeof userProfileFormSchema>;
