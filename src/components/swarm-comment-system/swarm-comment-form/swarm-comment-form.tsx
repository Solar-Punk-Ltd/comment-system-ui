import { CommentRequest } from "@solarpunkltd/comment-system";
import { useState } from "react";
import SwarmCommentInput from "../../swarm-comment-input/swarm-comment-input";

export interface SwarmCommentFormProps {
  loading: boolean;
  user?: string;
  ownAddress?: string;
  onSubmit: (comment: CommentRequest) => void;
}

interface FormElements extends HTMLFormControlsCollection {
  user: HTMLInputElement;
  data: HTMLInputElement;
}
interface CommentFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

interface FormErrors {
  user?: string;
  data?: string;
}

export default function SwarmCommentForm({
  loading,
  user,
  onSubmit,
}: SwarmCommentFormProps) {
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (value: string): string | undefined => {
    if (!value) {
      return "This field is required.";
    }
  };
  const hasErrors = (errors: FormErrors): boolean => {
    return Object.values(errors).some((value) => Boolean(value));
  };

  const submit = (event: React.FormEvent<CommentFormElement>) => {
    event.preventDefault();
    const elements = event.currentTarget.elements;
    user = user || elements.user.value;
    const data = elements.data.value;
    const errors: FormErrors = {
      user: validate(user),
      data: validate(data),
    };

    if (hasErrors(errors)) {
      return setErrors(errors);
    }

    onSubmit({ timestamp: Date.now(), data, user });
  };
  // TODO: remmove console.log or the entire form
  console.log(errors);
  return (
    <SwarmCommentInput
      nickname={user || "no user"}
      loading={loading}
      onSubmit={async () => {
        submit;
      }}
    />
  );
}
