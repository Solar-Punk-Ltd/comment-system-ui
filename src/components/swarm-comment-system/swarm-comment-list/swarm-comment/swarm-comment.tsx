import React, { useState } from "react";
import { CommentRequest } from "@solarpunkltd/comment-system";
import "./swarm-comment.scss";
import AvatarMonogram from "../../../icons/AvatarMonogram/AvatarMonogram";
import { createMonogram, formatTime } from "../../../../utils/helpers";

export interface SwarmCommentWithErrorFlag extends CommentRequest {
  error?: boolean;
  resend?: (comment: SwarmCommentWithErrorFlag) => Promise<void>;
}
// TODO: disable input if resending
const SwarmComment: React.FC<SwarmCommentWithErrorFlag> = ({
  user,
  data,
  timestamp,
  error,
  resend,
}) => {
  const [errorFlag, setErrorFlag] = useState<boolean | undefined>(error);
  const [sending, setSending] = useState<boolean>(false);

  const resendComment = async () => {
    if (!resend) {
      return;
    }
    const commentObj: SwarmCommentWithErrorFlag = {
      data: data,
      timestamp: Date.now(),
      user: user,
      error: true,
    };

    setSending(true);
    try {
      await resend(commentObj);
      setErrorFlag(false);
    } catch (err) {
      setErrorFlag(true);
      console.log("resend comment error: ", err);
    }

    setSending(false);
  };

  return (
    <div className="swarm-comment">
      <div className="swarm-comment__left-side">
        <AvatarMonogram letters={createMonogram(user)} />
      </div>

      <div className="swarm-comment__right-side">
        <div className="swarm-comment__right-side__name-and-time">
          <p className="swarm-comment__right-side__name-and-time__username">
            {user}
          </p>
          <p className="swarm-comment__right-side__name-and-time__time">
            {formatTime(timestamp)}
          </p>
        </div>

        <p
          className={
            errorFlag
              ? "swarm-comment__right-side__text__error"
              : "swarm-comment__right-side__text"
          }
        >
          {data}
        </p>
        {errorFlag && (
          <button
            onClick={resendComment}
            className="swarm-comment__right-side__retry"
            disabled={sending}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default SwarmComment;
