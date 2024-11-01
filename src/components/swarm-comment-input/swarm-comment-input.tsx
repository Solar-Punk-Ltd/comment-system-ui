// import React, { useState, useRef, ChangeEvent, useEffect } from "react";
import React, { useState, ChangeEvent } from "react";
import { Comment, UserComment } from "@solarpunkltd/comment-system";
import "./swarm-comment-input.scss";
import SendIcon from "../icons/SendIcon/SendIcon";
import { MAX_CHARACTER_COUNT } from "../../utils/constants";

interface SwarmCommentInputProps {
  username: string;
  maxCharacterCount?: number;
  onSubmit: (comment: UserComment) => Promise<void>;
}

const SwarmCommentInput: React.FC<SwarmCommentInputProps> = ({
  username,
  maxCharacterCount,
  onSubmit,
}) => {
  const [commentToSend, setCommentToSend] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !sending) {
      sendComment();
    }
  };

  const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    const maxCharCount = maxCharacterCount || MAX_CHARACTER_COUNT;
    if (e.target.value.length > maxCharCount) {
      console.log("max comment length reached: ", maxCharCount);
      return;
    }
    setCommentToSend(e.target.value);
  };

  const sendComment = async () => {
    if (!commentToSend) return;
    const commentObj: Comment = {
      text: commentToSend,
    };

    const userCommentObj: UserComment = {
      message: commentObj,
      timestamp: Date.now(),
      username: username,
    };

    setSending(true);
    try {
      await onSubmit(userCommentObj);
    } catch (err) {
      console.error("Submit comment error: ", err);
    }

    setCommentToSend("");
    setSending(false);
  };

  return (
    <div className="swarm-comment-input">
      <>
        <input
          value={commentToSend}
          onChange={(e) => handleOnChange(e)}
          onKeyDown={handleKeyDown}
          className="swarm-comment-input__input"
        />
        <button
          onClick={sendComment}
          className="swarm-comment-input__send-button"
          disabled={sending}
        >
          <SendIcon />
        </button>
      </>
    </div>
  );
};

export default SwarmCommentInput;
