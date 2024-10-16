// import React, { useState, useRef, ChangeEvent, useEffect } from "react";
import React, { useState, ChangeEvent } from "react";
import { CommentRequest } from "@solarpunkltd/comment-system";
import "./swarm-comment-input.scss";
import SendIcon from "../icons/SendIcon/SendIcon";
import { MAX_CHARACTER_COUNT } from "../../utils/helpers";

interface SwarmCommentInputProps {
  username: string;
  maxCharacterCount?: number;
  buttonRef: React.RefObject<HTMLButtonElement>;
  onResend: (failedFlag: boolean) => void;
  onSubmit: (comment: CommentRequest) => Promise<void>;
}

const SwarmCommentInput: React.FC<SwarmCommentInputProps> = ({
  username,
  maxCharacterCount,
  buttonRef,
  onResend,
  onSubmit,
}) => {
  const [commentToSend, setCommentToSend] = useState("");
  const [sending, setSending] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
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
      setCommentToSend("");
      onResend(false);
    } catch (err) {
      onResend(true);
      console.log("onSubmit error: ", err);
    }

    setSending(false);
  };

  return (
    <div
      className={
        sending ? "swarm-comment-input__processing" : "swarm-comment-input"
      }
    >
      {sending ? (
        <>{"Sending comment..."}</>
      ) : (
        <>
          <input
            value={commentToSend}
            onChange={(e) => handleOnChange(e)}
            onKeyDown={handleKeyDown}
            className="swarm-comment-input__input"
          />
          <button
            onClick={sendComment}
            ref={buttonRef}
            className="swarm-comment-input__send-button"
            disabled={sending}
          >
            <SendIcon />
          </button>
        </>
      )}
    </div>
  );
};

export default SwarmCommentInput;
