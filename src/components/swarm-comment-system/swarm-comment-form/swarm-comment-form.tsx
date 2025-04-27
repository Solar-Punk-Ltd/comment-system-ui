import { EthAddress } from "@ethersphere/bee-js";
import { User, UserComment } from "@solarpunkltd/comment-system";
import React, { useEffect, useState } from "react";

import styles from "./swarm-comment-form.module.scss";

export interface SwarmCommentFormProps {
  loading: boolean;
  onSubmit: (comment: UserComment) => Promise<void>;
  maxCharacterCount?: number;
  className?: string;
}

interface FormElements extends HTMLFormControlsCollection {
  username: HTMLInputElement;
  text: HTMLInputElement;
  address: HTMLInputElement;
}
interface CommentFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

interface FormErrors {
  username?: string;
  text?: string;
  address?: string;
}

export default function SwarmCommentForm({ loading, onSubmit, maxCharacterCount, className }: SwarmCommentFormProps) {
  const [errors, setErrors] = useState<FormErrors>({});
  const [user, setUser] = useState<User | undefined>(undefined);

  const validate = (value: string): string | undefined => {
    if (!value) {
      return "This field is required.";
    }

    if (maxCharacterCount && value.length > maxCharacterCount) {
      return `The maximum number of characters is ${maxCharacterCount}.`;
    }

    return undefined;
  };

  const validateAddress = (value: string): string | undefined => {
    if (!value) {
      return "This field is required.";
    }

    if (value.length !== 42) {
      return "Address must be 42 characters long.";
    }

    try {
      new EthAddress(value);
    } catch (error) {
      return `Invalid Ethereum address: ${error}`;
    }

    return undefined;
  };

  const hasErrors = (errors: FormErrors): boolean => {
    return Object.values(errors).some(value => Boolean(value));
  };

  const submit = async (event: React.FormEvent<CommentFormElement>) => {
    event.preventDefault();
    const elements = event.currentTarget.elements;
    const username = elements.username.value;
    const text = elements.text.value;
    const address = elements.address.value;
    const errors: FormErrors = {
      username: validate(username),
      text: validate(text),
      address: validateAddress(address),
    };

    if (hasErrors(errors)) {
      setErrors(errors);
      return;
    }

    try {
      await onSubmit({ user: { username, address }, message: { text: text }, timestamp: Date.now() });
      if (!user) {
        localStorage.setItem("user", JSON.stringify({ username, address }));
        setUser({ username, address });
      }
    } catch (error) {
      console.error("Error submitting comment: ", error);
    }
  };

  useEffect(() => {
    const userItem = localStorage.getItem("user");
    if (userItem) {
      const parsedUser = JSON.parse(userItem);
      setUser({ username: parsedUser.username, address: parsedUser.address });
    }
  }, []);

  return (
    <form className={`${styles["swarm-comment-form"]} ${className}`} onSubmit={submit}>
      <h6>Add comment:</h6>
      <input
        className={errors.username && styles["field-error"]}
        onChange={() => setErrors({ ...errors, username: undefined })}
        type="text"
        name="username"
        placeholder="Your name"
        disabled={loading}
        defaultValue={user ? user.username : ""}
      />
      <input
        className={errors.address && styles["field-error"]}
        onChange={() => setErrors({ ...errors, address: undefined })}
        type="text"
        name="address"
        disabled={loading}
        maxLength={42}
        minLength={42}
        placeholder={"0x1234567890123456789012345678901234567890"}
        defaultValue={user ? user.address : ""}
      />
      <textarea
        className={errors.text && styles["field-error"]}
        onChange={() => setErrors({ ...errors, text: undefined })}
        name="text"
        rows={5}
        disabled={loading}
      ></textarea>
      <button disabled={loading}>Submit</button>
    </form>
  );
}
