import { createSupabaseServerClient } from "../../lib/supabase/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({
    image: {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      const supabase = createSupabaseServerClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      // If you throw, the user will not be able to upload
      if (authError || !user) {
        console.error("UploadThing auth error:", authError);
        throw new UploadThingError("Unauthorized");
      }

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // THIS IS THE ABSOLUTE FIRST LINE IN THE SERVER'S onUploadComplete
      // Server-side callback after file upload
      console.log('[UploadThing SRV] onUploadComplete triggered for User ID:', metadata.userId);
      console.log('[UploadThing SRV] File ufsUrl:', file.ufsUrl);
      // console.log('[UploadThing SRV] Full File Object:', JSON.stringify(file, null, 2)); // Keep for potential future debugging
      // Minimal return, the act of not throwing an error signals success to UploadThing
      return { uploadedBy: metadata.userId, receivedFileUrl: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
