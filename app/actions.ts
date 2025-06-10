"use server";


import { createSupabaseServerClient } from './lib/supabase/server';
import { redirect } from "next/navigation";
import { prisma } from "./lib/prisma";
import { Prisma, VoteType } from "@prisma/client";
import { FormState, UserRoleType, userProfileFormSchema } from './lib/definitions';
import { revalidatePath } from "next/cache";
import { JSONContent } from "@tiptap/react";

export async function updateUsername(prevState: unknown, formData: FormData): Promise<FormState & { newUsername?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    // For actions not returning FormState directly on auth failure, redirect is okay.
    // However, if it's part of a form, returning FormState is better.
    return redirect("/login"); 
  }

  const username = formData.get("username") as string;
  if (!username || username.trim().length < 3) {
    return { message: "Username must be at least 3 characters.", status: "error", fieldValues: { username } };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { userName: username.trim() },
    });

    revalidatePath("/"); // Consider more specific paths if known
    return {
      message: "Username updated successfully!",
      status: "success",
      newUsername: username.trim(),
    };
  } catch (prismaError) {
    const pe = prismaError as { code?: string; meta?: { target?: string | string[] } };
    if (pe.code === 'P2002') { // Unique constraint violation
      return { message: "This username is already taken.", status: "error", fieldValues: { username } };
    }
    console.error("Error updating username:", prismaError);
    return { message: "An unexpected error occurred while updating username.", status: "error", fieldValues: { username } };
  }
}

export async function createCommunity(prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return redirect("/login");
  }

  const name = formData.get("name") as string;
  if (!name || name.trim().length < 3) {
    return { message: "Community name must be at least 3 characters.", status: "error", fieldValues: { name } };
  }

  try {
    const { name: createdName } = await prisma.subpost.create({
      data: { name: name.trim(), userId: user.id },
      select: { name: true },
    });

    revalidatePath("/");
    revalidatePath(`/p/${createdName}`);
    return {
      status: 'success',
      message: `Community '${createdName}' created successfully!`,
      redirectTo: `/p/${createdName}`,
      fieldValues: { name: '' } // Clear the input field on success
    };
  } catch (_e: unknown) {
    const pe = _e as { code?: string };
    if (pe.code === 'P2002') {
      return { message: "This community name is already taken.", status: "error", fieldValues: { name } };
    }
    console.error("Error creating community:", _e);
    return { message: "An unexpected error occurred while creating community.", status: "error", fieldValues: { name } };
  }
}

export async function updateSubDescription(
  prevState: unknown,
  formData: FormData
): Promise<FormState> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return redirect("/login");
  }

  const subName = formData.get("subName") as string;
  const description = formData.get("description") as string;

  if (!subName) {
    return { status: "error", message: "Subcommunity name is missing." };
  }

  try {
    await prisma.subpost.update({
      where: { name: subName },
      data: { description: description.trim() },
    });

    revalidatePath(`/p/${subName}`);
    return { status: "success", message: "Successfully updated the description." };
  } catch (e) {
    console.error("Error updating sub description:", e);
    return { status: "error", message: "Something went wrong while updating description." };
  }
}

export async function createPost(
  { jsonContent }: { jsonContent: JSONContent | null },
  formData: FormData
): Promise<FormState> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return redirect("/login");
  }

  const title = formData.get("title") as string;
  const imageUrl = formData.get("imageUrl") as string | null;
  const subName = formData.get("subName") as string;

  // Check if subName is provided and if the community exists
  if (!subName || subName.trim().length === 0) {
    return {
      status: 'error',
      message: 'Community name (subName) is missing or empty for the post.',
      errors: { _form: ['Community context is missing. Cannot create post.'] },
      fieldValues: getRawFieldValues(formData)
    };
  }

  const community = await prisma.subpost.findUnique({
    where: { name: subName.trim() }, // Ensure we trim subName here as well
    select: { name: true } // Only select what's necessary
  });

  if (!community) {
    return {
      status: 'error',
      message: `Community '${subName.trim()}' not found. Cannot create post.`,
      errors: { _form: [`Community '${subName.trim()}' does not exist.`] },
      fieldValues: getRawFieldValues(formData)
    };
  }

  const sourcePath = formData.get("sourcePath") as string || "/";
  if (!title || title.trim().length === 0) {
    return {
      status: 'error',
      message: 'Post title is required.',
      errors: { title: ['Post title cannot be empty.'] },
      fieldValues: getRawFieldValues(formData) 
    };
  }

  const { id } = await prisma.post.create({
    data: {
      title: title.trim(),
      imageString: imageUrl?.trim() || undefined,
      subName,
      userId: user.id,
      textContent: jsonContent ?? undefined,
    },
    select: { id: true },
  });

  revalidatePath(`/p/${subName}`); // Revalidate the community page
  revalidatePath('/'); // Revalidate home/feed if posts appear there
  return {
    status: 'success',
    message: 'Post created successfully!',
    redirectTo: `/post/${id}`
  };
}

export async function handleVote(formData: FormData): Promise<void> {
  // Helper function to determine score adjustment
  const calculateScoreAdjustment = (existingVoteType: VoteType | null, newVoteType: VoteType): number => {
    if (existingVoteType === newVoteType) { // Vote removed (e.g., upvote clicked again)
      return newVoteType === 'UP' ? -1 : 1;
    } else if (existingVoteType === null) { // New vote
      return newVoteType === 'UP' ? 1 : -1;
    } else { // Vote changed (e.g., upvote to downvote)
      if (newVoteType === 'UP') return 2; // Was DOWN, now UP (+1 for removing DOWN, +1 for adding UP)
      return -2; // Was UP, now DOWN (-1 for removing UP, -1 for adding DOWN)
    }
  };

  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return redirect("/login"); // Or return error if part of a form state
  }

  const postId = formData.get("postId") as string;
  const voteDirection = formData.get("voteDirection") as VoteType;
  const path = formData.get("path") as string || "/";

  if (!postId || !voteDirection) {
    console.error("Missing postId or voteDirection for handleVote");
    return revalidatePath(path);
  }

  // Start Prisma transaction
  try {
    await prisma.$transaction(async (tx) => {
      const vote = await tx.vote.findFirst({
    where: { postId, userId: user.id },
  });

      let scoreAdjustment = 0;

      if (vote) { // Existing vote found
        scoreAdjustment = calculateScoreAdjustment(vote.voteType, voteDirection);
        if (vote.voteType === voteDirection) {
          // User clicked the same vote button again (e.g., upvoted then clicked upvote again to remove vote)
          await tx.vote.delete({ where: { id: vote.id } });
        } else {
          // User changed their vote (e.g., from upvote to downvote)
          await tx.vote.update({
            where: { id: vote.id },
            data: { voteType: voteDirection },
          });
        }
      } else { // No existing vote, create a new one
        scoreAdjustment = calculateScoreAdjustment(null, voteDirection);
        await tx.vote.create({
          data: { voteType: voteDirection, userId: user.id, postId },
        });
      }

      // Update the post's netVoteScore
      if (scoreAdjustment !== 0) {
        await tx.post.update({
          where: { id: postId },
          data: { netVoteScore: { increment: scoreAdjustment } },
        });
      }
    });
  } catch (error) {
    console.error("Error in handleVote transaction:", error);
    // Optionally, you could return an error state or re-throw if not handling it here
    // For now, just revalidate and let client handle potential inconsistencies if error occurs
  }

  revalidatePath(path);
}

export async function deletePostAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 'error', message: 'You must be logged in to delete a post.' };
  }

  const postId = formData.get('postId') as string;
  if (!postId) {
    return { status: 'error', message: 'Post ID is missing.' };
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true, subName: true, User: { select: { userName: true } } }, // Include subName and userName for revalidation paths
    });

    if (!post) {
      return { status: 'error', message: 'Post not found.' };
    }

    if (post.userId !== user.id) {
      return { status: 'error', message: 'You are not authorized to delete this post.' };
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    // Revalidate relevant paths
    revalidatePath('/'); // Homepage/feed
    if (post.subName) {
      revalidatePath(`/p/${post.subName}`); // BHub page
    }
    if (post.User?.userName) {
      revalidatePath(`/profile/${post.User.userName}`); // User's profile page
    }
    // The specific post page /post/[postId] will naturally 404 or redirect, 
    // but revalidating its parent or related feeds is good.

    const baseRedirectPath = post.subName && post.subName !== 'PublicSphere' ? `/p/${post.subName}` : '/';
    const redirectUrlWithToast = `${baseRedirectPath}?toast_message=post_deleted_successfully`;
    redirect(redirectUrlWithToast);
    // If redirect() successfully interrupts execution, this success return may not be reached by the client.
    // return { status: 'success', message: 'Post deleted successfully.' }; // Optional for type consistency
  } catch (error: any) { // Type error as any to access digest
    // Check if it's a Next.js redirect error
    if (typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error; // Re-throw the redirect error so Next.js can handle it
    }
    // Handle other errors
    console.error('Error deleting post:', error);
    return { status: 'error', message: 'An unexpected error occurred while deleting the post.' };
  }
}

export async function deleteCommentAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 'error', message: 'You must be logged in to delete a comment.' };
  }

  const commentId = formData.get('commentId') as string;
  if (!commentId) {
    return { status: 'error', message: 'Comment ID is missing.' };
  }

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, postId: true },
    });

    if (!comment) {
      return { status: 'error', message: 'Comment not found.' };
    }

    if (comment.userId !== user.id) {
      return { status: 'error', message: 'You are not authorized to delete this comment.' };
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    if (comment.postId) {
      revalidatePath(`/post/${comment.postId}`); // Revalidate the specific post page
    }

    return { status: 'success', message: 'Comment deleted successfully.' };
  } catch (error) {
    console.error('Error deleting comment:', error);
    return { status: 'error', message: 'An unexpected error occurred while deleting the comment.' };
  }
}

export async function createComment(formData: FormData): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return redirect("/login");
  }

  const comment = formData.get("comment") as string;
  const postId = formData.get("postId") as string;

  if (!comment || comment.trim().length === 0 || !postId) {
    console.error("Missing comment text or postId for createComment");
    return revalidatePath(`/post/${postId || ''}`);
  }

  await prisma.comment.create({
    data: { text: comment.trim(), userId: user.id, postId },
  });

  revalidatePath(`/post/${postId}`);
}

export async function updateProfilePicture(
  prevState: FormState, 
  formData: FormData
): Promise<FormState & { imageUrl?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 'error', message: "User not authenticated. Please log in again.", errors: { _form: ['Authentication failed.'] } };
  }

  try {
    const picture = formData.get("profilePicture") as File | null;

    if (!picture || !picture.type.startsWith("image/")) {
      return { status: 'error', message: "Please upload a valid image file.", errors: { profilePicture: ['Invalid file type.'] } };
    }
    if (picture.size > 5 * 1024 * 1024) { // 5MB limit
        return { status: 'error', message: "Image size cannot exceed 5MB.", errors: { profilePicture: ['Image too large.'] } };
    }

    const fileExt = picture.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `public/${fileName}`; // Path for Supabase storage (avatars bucket, public folder inside)

    const currentUser = await prisma.user.findUnique({ where: { id: user.id }, select: { imageUrl: true } });
    if (currentUser?.imageUrl) {
        try {
            const oldFileKey = currentUser.imageUrl.substring(currentUser.imageUrl.lastIndexOf('public/') + 'public/'.length);
            if (oldFileKey) {
                await supabase.storage.from('avatars').remove([`public/${oldFileKey}`]);
            }
        } catch (removeError) {
            console.warn("Failed to remove old profile picture:", removeError);
        }
    }

    const { error: uploadError } = await supabase.storage
      .from('avatars') 
      .upload(filePath, picture);

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      return { status: 'error', message: "Failed to upload profile picture.", errors: { _form: ['Storage upload failed.'] } };
    }
    
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    if (!publicUrl) {
        return { status: 'error', message: "Failed to get public URL for profile picture.", errors: { _form: ['Could not retrieve public URL.'] } };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { imageUrl: publicUrl },
    });

    revalidatePath("/", "layout");
    return {
      status: "success",
      message: "Profile picture updated successfully!",
      imageUrl: publicUrl,
    };
  } catch (e) {
    console.error("Error updating profile picture:", e);
    const errorMessage = e instanceof Error ? e.message : "Failed to update profile picture due to an unexpected error.";
    return {
      status: "error",
      message: errorMessage,
      errors: { _form: [errorMessage] }
    };
  }
}

export async function signUpAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = createSupabaseServerClient();
  const fieldValues = { email };

  if (!email || !password) {
    return {
      status: 'error',
      message: "Email and password are required.",
      errors: {
        email: !email ? ["Email is required."] : undefined,
        password: !password ? ["Password is required."] : undefined,
      },
      fieldValues
    };
  }
  if (password.length < 6) {
    return { status: 'error', message: "Password must be at least 6 characters long.", errors: { password: ["Password too short."] }, fieldValues };
  }
  if (!email.endsWith("@binus.ac.id") && !email.endsWith("@binus.edu")) {
    return { status: 'error', message: "Invalid email domain. Must be @binus.ac.id or @binus.edu.", errors: { email: ["Invalid email domain."] }, fieldValues };
  }
  
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

  if (signUpError) {
    if (signUpError.message.includes("User already registered")) {
         return { status: 'error', message: "This email is already registered. Try logging in.", errors: { email: ["User already registered"] }, fieldValues };
    }
    return { status: 'error', message: signUpError.message || "Sign up failed.", errors: { _form: [signUpError.message || "Sign up failed."] }, fieldValues };
  }
  if (!signUpData.user) {
    return { status: 'error', message: "Sign up failed: No user data returned.", errors: { _form: ["Sign up failed: No user data returned."] }, fieldValues };
  }

  try {
    await prisma.user.create({
      data: {
        id: signUpData.user.id, 
        email: signUpData.user.email!,
        fullName: signUpData.user.email!.split('@')[0],
      },
    });
    return { status: 'success', message: "Sign up successful! Please check your email to verify your account." };
  } catch (prismaError: unknown) {
    console.error("Prisma user creation failed:", prismaError);
    const pe = prismaError as { code?: string; meta?: { target?: string | string[] } };
    if (pe.code === 'P2002') {
      return { status: 'error', message: "This email is already registered.", errors: { email: ["Email already in use."] }, fieldValues };
    }
    return { status: 'error', message: "Account created, but profile setup failed.", errors: { _form: ["Profile setup failed."] }, fieldValues };
  }
}

export async function loginAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = createSupabaseServerClient();
  const fieldValues = { email };

  if (!email || !password) {
    return { status: 'error', message: "Email and password are required.", errors: { email: !email ? ["Email required."] : undefined, password: !password ? ["Password required."] : undefined }, fieldValues };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message === 'Invalid login credentials') {
        return { status: 'error', message: "Invalid email or password.", errors: { _form: ["Invalid credentials."] }, fieldValues };
    } else if (error.message === 'Email not confirmed') { 
        return { status: 'error', message: "Please confirm your email before logging in.", errors: { _form: ["Email not confirmed."] }, fieldValues };
    }
    return { status: 'error', message: error.message || "Login failed.", errors: { _form: [error.message || "Login failed."] }, fieldValues };
  }
  
  revalidatePath('/', 'layout'); 
  return { status: 'success', message: "Login successful!" }; 
}

export async function logoutAction(): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}


function getRawFieldValues(formData: FormData): Record<string, any> {
  const submittedFieldValues = Object.fromEntries(formData.entries());
  let parsedCustomLinks: any[] = [];
  if (typeof submittedFieldValues.customLinks === 'string' && submittedFieldValues.customLinks.trim() !== '') {
    try { parsedCustomLinks = JSON.parse(submittedFieldValues.customLinks); } catch { /* ignore parse error, keep empty */ }
  } else if (Array.isArray(submittedFieldValues.customLinks)) {
    parsedCustomLinks = submittedFieldValues.customLinks;
  }

  return {
    ...submittedFieldValues,
    userPrimaryRole: submittedFieldValues.userPrimaryRole as UserRoleType | undefined,
    campusLocations: formData.getAll('campusLocations'),
    occupationRole: formData.getAll('occupationRole').map(String).filter(s => s.trim() !== ''),
    customLinks: parsedCustomLinks,
  };
}

async function updateUserProfileCore(
  formData: FormData,
  userId: string,
  setProfileComplete: boolean,
  prevState?: FormState 
): Promise<FormState> {
  const rawFieldValuesForRepopulation = getRawFieldValues(formData);
  const rawData = Object.fromEntries(formData.entries());
  
  const dataToValidate = {
    ...rawData,
    userName: rawData.userName || '', // Ensure userName is passed for validation
    campusLocations: formData.getAll('campusLocations'),
    occupationRole: formData.getAll('occupationRole').map(String).filter(s => s.trim() !== ''),
    customLinks: rawData.customLinks || '[]',
    studentBatch: rawData.studentBatch || undefined,
    userPrimaryRole: rawData.userPrimaryRole || undefined,
  };

  const validatedFields = userProfileFormSchema.safeParse(dataToValidate);

  if (!validatedFields.success) {
    return {
      status: 'error',
      message: 'Validation failed. Please check the fields.',
      errors: validatedFields.error.flatten().fieldErrors as Record<string, string[] | undefined> & { _form?: string[] },
      fieldValues: rawFieldValuesForRepopulation,
    };
  }

  const { ...profileData } = validatedFields.data;

  try {
    const updateData: Prisma.UserUpdateInput = {
      fullName: profileData.fullName,
      userName: profileData.userName.trim(), // Already validated to be non-empty if required
      userPrimaryRole: profileData.userPrimaryRole,
      nim: (profileData.userPrimaryRole === UserRoleType.STUDENT || profileData.userPrimaryRole === UserRoleType.BOTH) ? profileData.nim : null,
      studentMajor: (profileData.userPrimaryRole === UserRoleType.STUDENT || profileData.userPrimaryRole === UserRoleType.BOTH) ? profileData.studentMajor : null,
      studentBatch: (profileData.userPrimaryRole === UserRoleType.STUDENT || profileData.userPrimaryRole === UserRoleType.BOTH) ? `B-${profileData.studentBatch}` : null,
      employeeId: (profileData.userPrimaryRole === UserRoleType.EMPLOYEE || profileData.userPrimaryRole === UserRoleType.BOTH) ? profileData.employeeId : null,
      employeeDepartment: (profileData.userPrimaryRole === UserRoleType.EMPLOYEE || profileData.userPrimaryRole === UserRoleType.BOTH) ? profileData.employeeDepartment : null,
      campusLocations: profileData.campusLocations ?? [],
      bioDescription: profileData.bioDescription,
      occupationRole: profileData.occupationRole ?? [],
      customLinks: profileData.customLinks as Prisma.InputJsonValue ?? [],
      updatedAt: new Date(),
    };

    if (setProfileComplete) {
      updateData.profileComplete = true;
    }
    if (profileData.userPrimaryRole === UserRoleType.STUDENT) {
        updateData.employeeId = null; updateData.employeeDepartment = null;
    } else if (profileData.userPrimaryRole === UserRoleType.EMPLOYEE) {
        updateData.nim = null; updateData.studentMajor = null; updateData.studentBatch = null;
    }

    await prisma.user.update({ where: { id: userId }, data: updateData });
    revalidatePath('/', 'layout');
    
    const successMessage = setProfileComplete ? 'Profile completed successfully!' : 'Profile updated successfully!';
    const response: FormState = { status: 'success', message: successMessage, fieldValues: rawFieldValuesForRepopulation };
    if (setProfileComplete) {
      response.redirectTo = '/'; // Redirect to home page after onboarding
    }
    return response;

  } catch (error) {
    let specificMessage = 'An unexpected error occurred.';
    const fieldErrorsUpdate: Record<string, string[] | undefined> & { _form?: string[] } = { _form: [] };

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = error.meta?.target as string[] | undefined;
      if (target?.includes('userName')) { fieldErrorsUpdate.userName = ['This username is already taken.']; specificMessage = 'Username already taken.'; }
      else if (target?.includes('nim')) { fieldErrorsUpdate.nim = ['This NIM is already registered.']; specificMessage = 'NIM already registered.'; }
      else if (target?.includes('employeeId')) { fieldErrorsUpdate.employeeId = ['This Employee ID is already registered.']; specificMessage = 'Employee ID already registered.'; }
      else { specificMessage = 'A piece of information you provided is already in use.'; }
    } else if (error instanceof Error) {
      specificMessage = error.message;
    } else {
      specificMessage = 'An unknown error occurred during profile update/completion.';
    }
    if (!fieldErrorsUpdate._form) fieldErrorsUpdate._form = []; // Ensure _form is initialized
    fieldErrorsUpdate._form.push(specificMessage);
    return { status: 'error', message: specificMessage, errors: fieldErrorsUpdate, fieldValues: rawFieldValuesForRepopulation };
  }
}

export async function completeOnboardingAction(
  prevState: FormState, 
  formData: FormData
): Promise<FormState> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  const rawFieldValuesForRepopulation = getRawFieldValues(formData);

  if (authError || !user) {
    return { status: 'error', message: 'User not authenticated.', errors: { _form: ['Authentication failed.'] }, fieldValues: rawFieldValuesForRepopulation };
  }
  return updateUserProfileCore(formData, user.id, true, prevState);
}

export async function updateUserProfileAction(
  prevState: FormState, 
  formData: FormData
): Promise<FormState> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  const rawFieldValuesForRepopulation = getRawFieldValues(formData);

  if (authError || !user) {
    return { status: 'error', message: 'User not authenticated.', errors: { _form: ['Authentication failed.'] }, fieldValues: rawFieldValuesForRepopulation };
  }
  return updateUserProfileCore(formData, user.id, false, prevState);
}
