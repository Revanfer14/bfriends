"use client";

import { EditorContent, JSONContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import Placeholder from '@tiptap/extension-placeholder';

export function TipTapEditor({
  setJson,
  json,
}: {
  setJson: (json: JSONContent) => void;
  json: JSONContent | null;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Hello Binusian! What's on your mind?",
      }),
    ],
    content: json, // Let Placeholder handle empty state
    editorProps: {
      attributes: {
        class: "prose",
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      setJson(json);
    },
  });
  return (
    <div>
      <EditorContent
        editor={editor}
        className="rounded-lg border p-2 min-h-[150px] mt-2 max-w-[585px]"
      />
    </div>
  );
}
