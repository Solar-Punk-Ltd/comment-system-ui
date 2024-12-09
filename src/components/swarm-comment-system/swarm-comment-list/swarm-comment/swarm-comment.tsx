import React, { useState } from "react";
import { Comment, UserComment } from "@solarpunkltd/comment-system";
import clsx from "clsx";

import { createMonogram, formatTime } from "../../../../utils/helpers";
import AvatarMonogram from "../../../icons/AvatarMonogram/AvatarMonogram";
import TryAgainIcon from "../../../icons/TryAgainIcon/TryAgainIcon";

import "./swarm-comment.scss";

export interface SwarmCommentWithFlags extends UserComment {
  error?: boolean;
  ownFilterFlag?: boolean;
  resend?: (comment: SwarmCommentWithFlags) => Promise<void>;
}

const SwarmComment: React.FC<SwarmCommentWithFlags> = ({
  message: { text },
  username,
  error,
  timestamp,
  // ownFilterFlag, TODO: different styling for own filtered comments
  resend,
}) => {
  const [errorFlag, setErrorFlag] = useState<boolean | undefined>(error);
  const [sending, setSending] = useState<boolean>(false);
  const actualUser = localStorage.getItem("username");

  const resendComment = async () => {
    if (!resend) {
      return;
    }
    const commentObj: Comment = {
      text: text,
    };

    const userCommentObj: SwarmCommentWithFlags = {
      message: commentObj,
      timestamp: Date.now(),
      username: username,
      error: errorFlag,
    };

    setSending(true);
    try {
      await resend(userCommentObj);
      setErrorFlag(false);
    } catch (err) {
      setErrorFlag(true);
      console.error("Resend comment error: ", err);
    }

    setSending(false);
  };

  return (
    <div className={clsx("swarm-comment", { own: username === actualUser })}>
      <div className="swarm-comment__avatar-side">
        <AvatarMonogram
          letters={createMonogram(username)}
          color={errorFlag ? "white" : username === actualUser ? "#333333" : "#4A2875"}
          backgroundColor={errorFlag ? "#C85050" : username === actualUser ? "#4A287533" : "#F7F8FA"}
        />
      </div>

      <div className="swarm-comment__message-side">
        <div
          className={clsx("swarm-comment__message-side__name", {
            own: username === actualUser,
            error: errorFlag,
          })}
        >
          <div className="swarm-comment__message-side__name__username-and-time">
            {username} &nbsp;
            <div className="swarm-comment__right-side__name-and-time__time">{formatTime(timestamp)}</div>
          </div>
        </div>

        <div
          className={clsx({
            "swarm-comment__message-side__text__error": errorFlag,
            "swarm-comment__message-side__text": !errorFlag && username !== actualUser,
            "swarm-comment__message-side__text own": !errorFlag && username === actualUser,
          })}
        >
          {text}
        </div>
        {errorFlag && (
          <div className="swarm-comment-message-side__try-again__wrapper">
            <div
              className={clsx("swarm-comment__message-side__try-again", {
                resending: sending,
              })}
            >
              We can't send your comment -{" "}
              <div onClick={resendComment} className="swarm-comment__message-side__try-again__text-with-icon">
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
