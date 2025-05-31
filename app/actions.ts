"use server";

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { createSupabaseServerClient } from './lib/supabase/server';
import { redirect } from "next/navigation";
import { prisma } from "./lib/prisma";
import { Prisma, VoteType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { JSONContent } from "@tiptap/react";



export async function updateUsername(prevState: unknown, formData: FormData) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    return redirect("/api/auth/login");
  }

  const username = formData.get("username") as string;

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { userName: username },
    });

    revalidatePath("/");

    return {
      message: "Name updated successfully",
      status: "green",
      newUsername: username,
    };
  } catch (prismaError) {
    if ((prismaError as any).code === 'P2002' && (prismaError as any).meta?.target === 'User_userName_key') {
      return { message: "This username is already used", status: "error" };
    }
    throw prismaError;
  }
}

export async function createCommunity(prevState: unknown, formData: FormData) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    return redirect("/api/auth/login");
  }

  try {
    const name = formData.get("name") as string;

    const { name: createdName } = await prisma.subpost.create({
      data: { name, userId: user.id },
      select: { name: true },
    });

    revalidatePath("/");
    return redirect(`/p/${createdName}`);
  } catch (_e: unknown) {
    if (typeof _e === 'object' && _e !== null && 'code' in _e && (_e as any).code === 'P2002') {
      return { message: "This name is already used", status: "error" };
    }
    throw _e;
  }
}

export async function updateSubDescription(
  prevState: unknown,
  formData: FormData
) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    return redirect("/api/auth/login");
  }

  try {
    const subName = formData.get("subName") as string;
    const description = formData.get("description") as string;

    await prisma.subpost.update({
      where: { name: subName },
      data: { description },
    });

    revalidatePath(`/p/${subName}`);
    return { status: "green", message: "Successfully updated the description" };
  } catch {
    return { status: "error", message: "Something went wrong" };
  }
}

export async function createPost(
  { jsonContent }: { jsonContent: JSONContent | null },
  formData: FormData
) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    return redirect("/api/auth/login");
  }

  const title = formData.get("title") as string;
  const imageUrl = formData.get("imageUrl") as string | null;
  const subName = formData.get("subName") as string;

  const { id } = await prisma.post.create({
    data: {
      title,
      imageString: imageUrl ?? undefined,
      subName,
      userId: user.id,
      textContent: jsonContent ?? undefined,
    },
    select: { id: true },
  });

  redirect(`/post/${id}`);
}

export async function handleVote(formData: FormData) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    return redirect("/api/auth/login");
  }

  const postId = formData.get("postId") as string;
  const voteDirection = formData.get("voteDirection") as VoteType;

  const vote = await prisma.vote.findFirst({
    where: { postId, userId: user.id },
  });

  if (vote) {
    if (vote.voteType === voteDirection) {
      await prisma.vote.delete({ where: { id: vote.id } });
    } else {
      await prisma.vote.update({
        where: { id: vote.id },
        data: { voteType: voteDirection },
      });
    }
    return revalidatePath("/");
  }

  await prisma.vote.create({
    data: { voteType: voteDirection, userId: user.id, postId },
  });

  return revalidatePath("/");
}

export async function createComment(formData: FormData) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    return redirect("/api/auth/login");
  }

  const comment = formData.get("comment") as string;
  const postId = formData.get("postId") as string;

  await prisma.comment.create({
    data: { text: comment, userId: user.id, postId },
  });

  revalidatePath(`/post/${postId}`);
}

export async function updateProfilePicture(
  prevState: unknown,
  formData: FormData
) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    return redirect("/api/auth/login");
  }

  try {
    const picture = formData.get("profilePicture") as File;

    if (!picture || !picture.type.startsWith("image/")) {
      return {
        message: "Please upload a valid image file",
        status: "error",
      };
    }

    // Convert the file to base64 string
    const bytes = await picture.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");
    const imageUrl = `data:${picture.type};base64,${base64Image}`;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        imageUrl,
      },
    });

    revalidatePath("/");
    return {
      message: "Profile picture updated successfully",
      status: "green",
      newPicture: imageUrl,
    };
  } catch {
    return {
      message: "Failed to update profile picture",
      status: "error",
    };
  }
}

// Define the state structure for the signUpAction form
export type SignUpFormState = {
  message: string;
  error: boolean;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
};

export async function signUpAction(
  prevState: SignUpFormState,
  formData: FormData
): Promise<SignUpFormState> {
  const supabase = createSupabaseServerClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Basic validation
  if (!email || !password) {
    return {
      message: "Email and password are required.",
      error: true,
      fieldErrors: {
        email: !email ? ["Email is required."] : undefined,
        password: !password ? ["Password is required."] : undefined,
      },
    };
  }

  if (password.length < 6) {
    return {
      message: "Password must be at least 6 characters long.",
      error: true,
      fieldErrors: { password: ["Password too short."] },
    };
  }

  // Domain validation
  if (!email.endsWith("@binus.ac.id")) {
    return {
      message: "Only @binus.ac.id emails are allowed.",
      error: true,
      fieldErrors: { email: ["Invalid email domain."] },
    };
  }

  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    // Optionally, configure email redirect for confirmation if not handled globally by Supabase settings
    // options: {
    //   emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    // },
  });

  if (signUpError) {
    return {
      message: signUpError.message || "Sign up failed. Please try again.",
      error: true,
    };
  }

  if (data.user) {
    // Create user profile in Prisma
    try {
      const username = email.split("@")[0]; // Default username from email prefix
      await prisma.user.create({
        data: {
          id: data.user.id, // Use Supabase user ID as Prisma user ID
          email: data.user.email!,
          userName: username,
          // fullName, universityId, etc., will be collected during onboarding
          profileComplete: false, // Mark profile as incomplete
        },
      });
      // On successful signup and profile creation
      return { message: "Sign up successful! Please check your email to verify your account.", error: false };
    } catch (prismaError: unknown) {
      // Handle potential Prisma errors
      let errorMessage = "Failed to create user profile after sign up. Please contact support.";
      if (typeof prismaError === 'object' && prismaError !== null && 'code' in prismaError) {
        const pe = prismaError as { code: string; meta?: { target?: string[] | string } };
        if (pe.code === 'P2002') {
          if (pe.meta?.target && ((typeof pe.meta.target === 'string' && pe.meta.target.includes('email')) || (Array.isArray(pe.meta.target) && pe.meta.target.includes('User_email_key')))) {
            return { message: "This email is already registered. Try logging in.", error: true, fieldErrors: {email: ["Email already in use."]} };
          } else if (pe.meta?.target && ((typeof pe.meta.target === 'string' && pe.meta.target.includes('userName')) || (Array.isArray(pe.meta.target) && pe.meta.target.includes('User_userName_key')))) {
            return { message: "A user with this generated username already exists. Please contact support.", error: true };
          }
        }
      }
      return { message: errorMessage, error: true };
    }
  }

  return { message: "An unknown error occurred during sign up. User data not available.", error: true };
}

// Define the state structure for the loginAction form
export type LoginFormState = {
  message: string;
  error: boolean;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
  redirectTo?: string; // Optional: for redirecting after successful login
};

export async function loginAction(
  prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const supabase = createSupabaseServerClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Basic validation
  if (!email || !password) {
    return {
      message: "Email and password are required.",
      error: true,
      fieldErrors: {
        email: !email ? ["Email is required."] : undefined,
        password: !password ? ["Password is required."] : undefined,
      },
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // More specific error messages can be returned based on error.name or error.message
    if (error.message === 'Invalid login credentials') {
        return { message: "Invalid email or password. Please try again.", error: true };
    } else if (error.message === 'Email not confirmed') {
        return { message: "Please confirm your email address before logging in.", error: true };
    }
    return { message: error.message || "Login failed. Please try again.", error: true };
  }

  // On successful login, Supabase sets a session cookie.
  // The page will re-render or user will navigate, and session check will redirect.
  // Optionally, trigger revalidation or redirect here if needed for specific flows.
  // revalidatePath('/', 'layout'); // Revalidate all data
  // return { message: "Login successful! Redirecting...", error: false, redirectTo: '/' };
  // For now, let the page handle redirection based on session state.
  // The redirect in LoginPage will handle moving to /onboarding or / based on profile status.
  
  // Important: If we redirect from here, the LoginForm's useEffect might not show a toast.
  // It's often better to let the page redirect based on the new session state.
  // However, to ensure the client knows to re-evaluate session (e.g. if middleware isn't catching it fast enough)
  // we can revalidatePath.
  revalidatePath('/', 'layout'); // This helps ensure client components and layouts re-fetch data if needed.

  return { message: "Login successful!", error: false }; // This message might be briefly shown by toast if no immediate redirect.
}

export async function logoutAction() {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error logging out:', error);
    // Optionally, return an error state to be handled by the client if direct invocation
    // For a form action, you might return { message: 'Logout failed', error: true }
    // but for a direct call often used for logout, redirect is typical.
    // Depending on how it's called, throwing an error or returning a specific state might be better.
    // For now, we'll log and redirect.
  }
  
  // Revalidate all paths to ensure user state is cleared everywhere
  revalidatePath('/', 'layout');
  redirect('/login'); // Redirect to login page after logout
}

// Define the state structure for the OnboardingForm action
export type OnboardingFormState = {
  message: string;
  error: boolean;
  fieldErrors?: {
    fullName?: string[];
    universityId?: string[];
    departmentMajor?: string[];
    batch?: string[];
    bioDescription?: string[];
    occupationRole?: string[];
    customLinks?: string[];
  };
};

export async function updateUserProfileAction(
  prevState: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { message: "User not authenticated.", error: true };
  }

  const fullName = formData.get("fullName") as string;
  const universityId = formData.get("universityId") as string;
  const departmentMajor = formData.get("departmentMajor") as string;
  const batch = formData.get("batch") as string;
  const bioDescription = formData.get("bioDescription") as string | null;
  const occupationRoleString = formData.get("occupationRole") as string | null;
  const customLinksString = formData.get("customLinks") as string | null;

  // Basic validation
  const fieldErrors: OnboardingFormState['fieldErrors'] = {};
  if (!fullName) fieldErrors.fullName = ["Full Name is required."];
  if (!universityId) fieldErrors.universityId = ["University ID is required."];
  if (!departmentMajor) fieldErrors.departmentMajor = ["Department/Major is required."];
  if (!batch) fieldErrors.batch = ["Batch is required."];
  // Add more specific validations as needed (e.g., universityId format, batch format)

  if (Object.keys(fieldErrors).length > 0) {
    return {
      message: "Please correct the errors below.",
      error: true,
      fieldErrors,
    };
  }

  let occupationRole: string[] = [];
  if (occupationRoleString && occupationRoleString.trim() !== '') {
    occupationRole = occupationRoleString.split(',').map(role => role.trim()).filter(role => role !== '');
  }

  // Use Prisma.InputJsonValue for updates; initialize with Prisma.JsonNull for non-nullable JSON fields if no value provided.
  let customLinksInput: Prisma.UserUpdateInput['customLinks'] = Prisma.JsonNull;
  if (customLinksString && customLinksString.trim() !== '') {
    try {
      const parsedLinks = JSON.parse(customLinksString);
      // Ensure parsedLinks is a non-array object, as Prisma expects InputJsonObject here.
      if (typeof parsedLinks === 'object' && parsedLinks !== null && !Array.isArray(parsedLinks)) {
        customLinksInput = parsedLinks; // parsedLinks is now an InputJsonObject
      } else {
        return { 
          message: "Custom Links must be a valid JSON object (e.g., {\"github\":\"your_url\"}). Arrays or primitives are not allowed here.", 
          error: true, 
          fieldErrors: { customLinks: ["Invalid format. Expected a JSON object."] } 
        };
      }
    } catch (e) {
      return { 
        message: "Custom Links string is not valid JSON. Please provide a valid JSON object string (e.g., {\"github\":\"your_url\"}).", 
        error: true, 
        fieldErrors: { customLinks: ["Invalid JSON string format."] } 
      };
    }
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName,
        universityId,
        departmentMajor,
        batch,
        bioDescription,
        occupationRole,
        customLinks: customLinksInput,
        profileComplete: true,
      },
    });
  } catch (e: any) {
    if (e.code === 'P2002' && e.meta?.target?.includes('universityId')) {
      return {
        message: "This University ID is already taken.",
        error: true,
        fieldErrors: { universityId: ["University ID already in use."] },
      };
    }
    console.error("Error updating profile:", e);
    return { message: "Failed to update profile. Please try again.", error: true };
  }

  revalidatePath('/', 'layout');
  redirect('/'); // Redirect to home page after successful onboarding
  // The redirect will prevent this return from being hit, but as a fallback:
  // return { message: "Profile updated successfully! Redirecting...", error: false }; 
}

