// import React, { useState, useRef, ChangeEvent, useEffect } from "react";
import React, { useState, ChangeEvent } from "react";
import { CommentRequest } from "@solarpunkltd/comment-system";
import "./swarm-comment-input.scss";
import SendIcon from "../icons/SendIcon/SendIcon";
import { MAX_CHARACTER_COUNT } from "../../utils/constants";

interface SwarmCommentInputProps {
  username: string;
  maxCharacterCount?: number;
  onSubmit: (comment: CommentRequest) => Promise<void>;
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
    const commentObj: CommentRequest = {
      data: commentToSend,
      timestamp: Date.now(),
      user: username,
    };

    setSending(true);
    try {
      await onSubmit(commentObj);
    } catch (err) {
      console.log("onSubmit error: ", err);
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
