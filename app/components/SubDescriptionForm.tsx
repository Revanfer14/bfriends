"use client";

import { Textarea } from "@/components/ui/textarea";
import { updateSubDescription } from "../actions";
import { SaveButton } from "./SubmitButtons";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

interface AppProps {
  subName: string;
  description: string | null | undefined;
}

const initialState = {
  message: "",
  status: "",
};

export function SubDescriptionForm({ subName, description }: AppProps) {
  const [state, formAction] = useActionState(
    updateSubDescription,
    initialState
  );

  useEffect(() => {
    if (state.status === "green") {
      toast.success("Success", {
        description: state.message,
      });
    } else if (state.status === "error") {
      toast.error("Error", {
        description: state.message,
      });
    }
  }, [state]);

  return (
    <form className="mt-3" action={formAction}>
      <input type="hidden" name="subName" value={subName} />
      <Textarea
        placeholder="Create description for the post"
        maxLength={150}
        minLength={2}
        name="description"
        defaultValue={description ?? undefined}
      />
      <SaveButton />
    </form>
  );
}
