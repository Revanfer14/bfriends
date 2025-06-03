"use client";

import { Share } from "lucide-react";
import { toast } from "sonner";

export function CopyLink({ id }: { id: string }) {
  // Copy current url
  async function copyToClipboard() {
    await navigator.clipboard.writeText(`${location.origin}/post/${id}`);
    toast.success("Success", {
      description: "Link successfully copied to clipboard",
    });
  }

  return (
    <button
      className="flex items-center gap-x-1 cursor-pointer"
      onClick={copyToClipboard}
    >
      <Share className="h-4 w-4 text-muted-foreground" />
      <p className="text-muted-foreground font-medium text-xs">Share</p>
    </button>
  );
}
