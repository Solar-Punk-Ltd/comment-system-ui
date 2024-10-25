import React, { useState } from "react";
import { CommentRequest } from "@solarpunkltd/comment-system";
import "./swarm-comment.scss";
import AvatarMonogram from "../../../icons/AvatarMonogram/AvatarMonogram";
import { createMonogram } from "../../../../utils/helpers";
import clsx from "clsx";
import TryAgainIcon from "../../../icons/TryAgainIcon/TryAgainIcon";

export interface SwarmCommentWithErrorFlag extends CommentRequest {
  error?: boolean;
  resend?: (comment: SwarmCommentWithErrorFlag) => Promise<void>;
}
// TODO: disable input if resending
const SwarmComment: React.FC<SwarmCommentWithErrorFlag> = ({
  user,
  data,
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

  return (
    <div className={clsx("swarm-comment", { own: user === actualUser })}>
      <div className="swarm-comment__avatar-side">
        <AvatarMonogram
          letters={createMonogram(user)}
          color={
            errorFlag ? "white" : user === actualUser ? "#333333" : "#4A2875"
          }
          backgroundColor={
            errorFlag
              ? "#C85050"
              : user === actualUser
              ? "#FF8A5033"
              : "#F7F8FA"
          }
        />
      </div>

      <div className="swarm-comment__message-side">
        <div
          className={clsx("swarm-comment__message-side__name", {
            own: user === actualUser,
            error: errorFlag,
          })}
        >
          <div className="swarm-comment__message-side__name__username">
            {user}
          </div>
        </div>

        <div
          className={clsx({
            "swarm-comment__message-side__text__error": errorFlag,
            "swarm-comment__message-side__text":
              !errorFlag && user !== actualUser,
            "swarm-comment__message-side__text own":
              !errorFlag && user === actualUser,
          })}
        >
          {data}
        </div>
        {errorFlag && (
          <div className="swarm-comment-message-side__try-again__wrapper">
            <div
              className={clsx("swarm-comment__message-side__try-again", {
                resending: sending,
              })}
            >
              We can't send your comment -{" "}
              <div
                onClick={resendComment}
                className="swarm-comment__message-side__try-again__text-with-icon"
              >
                Try again <TryAgainIcon />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SwarmComment;
