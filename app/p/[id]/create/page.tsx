"use client";

import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import Image from "next/image";
import pfp from "../../../../public/pfp.png";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TipTapEditor } from "@/app/components/TipTapEditor";
import { SubmitButton } from "@/app/components/SubmitButtons";
import { UploadDropzone } from "@/app/components/Uploadthing";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useActionState } from "react";
import { type FormState } from '@/app/lib/definitions';
import { toast } from 'sonner';
import { createPost } from "@/app/actions";
import { JSONContent } from "@tiptap/react";

const rules = [
  {
    id: 1,
    text: "Be respectful and kind",
  },
  {
    id: 2,
    text: "Keep your posts on-topic for each BHub.",
  },
  {
    id: 3,
    text: "Follow University's rules (PTTAK) – rule-breaking has consequences",
  },
];

const initialFormState: FormState = {
  message: '',
  status: 'idle',
  errors: undefined,
  fieldValues: undefined,
  redirectTo: undefined,
};

export default function CreatePostRoute() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [imageUrl, setImageUrl] = useState<null | string>(null);
  const [json, setJson] = useState<null | JSONContent>(null);
  const [title, setTitle] = useState<null | string>(null);

  // Action to be used with useActionState
  const handleCreatePost = async (prevState: FormState, formData: FormData): Promise<FormState> => {
    // Add the current json state to the call to createPost
    return createPost({ jsonContent: json }, formData);
  };

  const [state, formAction, isPending] = useActionState(handleCreatePost, initialFormState);

  useEffect(() => {
    if (state.status === 'error' && state.message) {
      toast.error('Error Creating Post', { description: state.message });
    } else if (state.status === 'success' && state.message) {
      toast.success('Post Created', { description: state.message });
      if (state.redirectTo) {
        router.push(state.redirectTo);
      }
    }
  }, [state, router]);

  return (
    <div className="max-w-[1000px] mx-auto flex gap-x-10 mt-4">
      <div className="w-[65%] flex flex-col gap-y-5">
        <h1 className="font-semibold">
          Post To:{" "}
          <Link href={`/p/${id}`} className="text-primary">
            bhub/{id}
          </Link>
        </h1>

        <Tabs className="w-full" defaultValue="post">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="post">
              {" "}
              <Text className="w-4 h-4 mr-2" />
              Post
            </TabsTrigger>
            <TabsTrigger value="imagevideo">
              <Video className="w-4 h-4 mr-2" />
              Image & Video
            </TabsTrigger>
          </TabsList>

          <TabsContent value="post">
            <Card>
              <form action={formAction}>
                <input
                  type="hidden"
                  name="imageUrl"
                  value={imageUrl ?? undefined}
                />
                <input type="hidden" name="subName" value={id} />
                <CardHeader>
                  <Label>Title</Label>
                  <Input
                    required
                    name="title"
                    placeholder="Title"
                    value={title ?? ""}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <TipTapEditor setJson={setJson} json={json} />
                </CardHeader>

                <CardFooter>
                  <SubmitButton text={isPending ? 'Creating...' : 'Create Post'} />
                  {state.status === 'error' && state.errors?.title && (
                    <p className="text-xs text-red-500 mt-1">{state.errors.title.join(', ')}</p>
                  )}
                  {state.status === 'error' && state.errors?._form && (
                    <p className="text-xs text-red-500 mt-1">{state.errors._form.join(', ')}</p>
                  )}
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="imagevideo">
            <Card>
              <CardHeader>
                {imageUrl === null ? (
                  <UploadDropzone
                    className="ut-button:bg-primary ut-button:ut-readying:bg-primary/50 ut-label:text-primary ut-button:ut-uploading:bg-primary/50 ut-button:ut-uploading:after:bg-primary"
                    endpoint="imageUploader"
                    onUploadBegin={(fileName) => {
                        // console.log('UploadDropzone: Upload begin for:', fileName);
                      }}
                    onClientUploadComplete={(res) => {
                      // console.log('UploadDropzone: Upload complete:', res);
                      if (res && res[0] && res[0].serverData && res[0].serverData.receivedFileUrl) {
                        // console.log('UploadDropzone: Setting image URL to:', res[0].serverData.receivedFileUrl);
                        setImageUrl(res[0].serverData.receivedFileUrl);
                      } else {
                        console.error('[UploadDropzone] Upload response or receivedFileUrl is invalid:', res); // Keep this error log
                        // alert('Upload completed but response was invalid. Please try again.');
                      }
                    }}
                    onUploadProgress={(progress) => {
                        // console.log('UploadDropzone: Upload progress:', progress, '%');
                        // setUploadProgress(progress);
                    }}
                    onUploadError={(error: Error) => {
                        console.error('[UploadDropzone] Upload error:', error.message); // Keep this error log
                        // setIsUploading(false);
                        // setUploadProgress(0);
                    }}
                  />
                ) : (
                  <Image
                    src={imageUrl}
                    width={500}
                    height={400}
                    alt="Uploaded Image"
                    className="h-80 rounded-lg w-full object-contain"
                  />
                )}
              </CardHeader>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="w-[35%]">
        <Card className="flex flex-col p-4">
          <div className="flex items-center gap-x-2">
            <Image src={pfp} alt="pfp" className="h-10 w-10" />
            <h1 className="font-bold">Rules before posting</h1>
          </div>

          <Separator className="mt-2" />

          <div className="flex flex-col gap-y-5 mt-5">
            {rules.map((item) => (
              <div key={item.id}>
                <p className="text-sm font-medium">
                  {item.id}. {item.text}
                </p>
                <Separator className="mt-2" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
