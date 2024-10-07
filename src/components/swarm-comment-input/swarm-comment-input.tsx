import React, { useState } from "react";
import SendIcon from "../icons/SendIcon/SendIcon";
import "./swarm-comment-input.scss";
import { CommentRequest } from "@solarpunkltd/comment-system";

type FlavoredType<Type, Name> = Type & {
  __tag__?: Name;
};
type HexString<Length extends number = number> = FlavoredType<
  string & {
    readonly length: Length;
  },
  "HexString"
>;
export declare const ETH_ADDRESS_LENGTH = 42;
export type EthAddress = HexString<typeof ETH_ADDRESS_LENGTH>;

interface SwarmCommentInputProps {
  username: string;
  onSubmit: (comment: CommentRequest) => Promise<void>;
}

const SwarmCommentInput: React.FC<SwarmCommentInputProps> = ({
  username,
  onSubmit,
}) => {
  const [commentToSend, setCommentToSend] = useState("");
  const [sending, setSending] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      sendComment();
    }
  };

  const sendComment = async () => {
    if (!commentToSend) return;
    const commentObj: CommentRequest = {
      data: commentToSend,
      timestamp: Date.now(),
      user: username,
    };

    setSending(true);
    await onSubmit(commentObj);

    setCommentToSend("");
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
            onChange={(e) => setCommentToSend(e.target.value)}
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
      )}
    </div>
  );
};

export default SwarmCommentInput;
