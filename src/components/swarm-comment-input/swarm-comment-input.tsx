import React, { useState } from "react";
import SendIcon from "../icons/SendIcon/SendIcon";
// import "./swarm-comment-input.scss";
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
  // TODO: processing style
  return (
    <div
      className={
        sending ? "swarm-comment-input__processing" : "swarm-comment-input"
      }
      style={{
        display: "flex",
        flexDirection: "row",
        margin: "8px 16px 8px 16px",
        justifyContent: "space-between",
        border: "1px solid #D4D5DD",
        borderRadius: "8px",
        height: "32px",
        position: "relative",
        bottom: "0",
        width: "100%",
        boxSizing: "border-box",
        left: "0",
      }}
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
            style={{
              flexGrow: "1",
              border: "none",
              margin: "3px",
            }}
          />
          <button
            onClick={sendComment}
            className="swarm-comment-input__send-button"
            disabled={sending}
            style={{
              border: "none",
              backgroundColor: "transparent",
              marginRight: "4px",
            }}
          >
            <SendIcon />
          </button>
        </>
      )}
    </div>
  );
};

export default SwarmCommentInput;
