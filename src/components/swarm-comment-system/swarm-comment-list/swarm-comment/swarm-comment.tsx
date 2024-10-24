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
  const actualUser = localStorage.getItem("username");

  const resendComment = async () => {
    if (!resend) {
      return;
    }
    const commentObj: SwarmCommentWithErrorFlag = {
      data: data,
      timestamp: Date.now(),
      user: user,
      error: errorFlag,
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

  return user !== actualUser ? (
    <div className="swarm-comment">
      <div className="swarm-comment__left-side">
        <AvatarMonogram letters={createMonogram(user)} />
      </div>

      <div className="swarm-comment__right-side">
        <div className="swarm-comment__right-side__name-and-time">
          <div className="swarm-comment__right-side__name-and-time__username">
            {user}
          </div>
          <div className="swarm-comment__right-side__name-and-time__time">
            {formatTime(timestamp)}
          </div>
        </div>

        <div
          className={
            errorFlag
              ? "swarm-comment__right-side__text__error"
              : "swarm-comment__right-side__text"
          }
        >
          {data}
        </div>
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
  ) : (
    <div className="swarm-comment own">
      <div className="swarm-comment__left-side">
        <AvatarMonogram
          letters={createMonogram(user)}
          color="#333333"
          backgroundColor="#FF8A5033"
        />
      </div>

      <div className="swarm-comment__right-side">
        <div className="swarm-comment__right-side__name-and-time own">
          <div className="swarm-comment__right-side__name-and-time__username">
            {user}
          </div>
          <div className="swarm-comment__right-side__name-and-time__time">
            {formatTime(timestamp)}
          </div>
        </div>

        <div
          className={
            errorFlag
              ? "swarm-comment__right-side__text__error"
              : "swarm-comment__right-side__text own"
          }
        >
          {data}
        </div>
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
