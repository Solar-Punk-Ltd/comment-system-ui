import { MessageData } from "@solarpunkltd/comment-system";
import clsx from "clsx";
import React, { useState } from "react";

import { createMonogram, formatTime } from "../../../../utils/helpers";
import AvatarMonogram from "../../../icons/AvatarMonogram/AvatarMonogram";
import TryAgainIcon from "../../../icons/TryAgainIcon/TryAgainIcon";

import "./swarm-comment.scss";

export interface SwarmCommentWithFlags extends MessageData {
  error?: boolean;
  ownFilterFlag?: boolean;
  resend?: (comment: SwarmCommentWithFlags) => Promise<void>;
}

const SwarmComment: React.FC<SwarmCommentWithFlags> = (msg: SwarmCommentWithFlags) => {
  const [errorFlag, setErrorFlag] = useState<boolean | undefined>(msg.error);
  const [sending, setSending] = useState<boolean>(false);
  const actualUser = localStorage.getItem("username");

  const resendComment = async () => {
    if (!msg.resend) {
      return;
    }

    setSending(true);

    try {
      await msg.resend({
        ...msg,
        timestamp: Date.now(),
        username: msg.username,
        error: errorFlag,
      });
      setErrorFlag(false);
    } catch (err) {
      setErrorFlag(true);
      console.error("Resend comment error: ", err);
    }

    setSending(false);
  };

  return (
    <div className={clsx("swarm-comment", { own: msg.username === actualUser })}>
      <div className="swarm-comment__avatar-side">
        <AvatarMonogram
          letters={createMonogram(msg.username)}
          color={errorFlag ? "white" : msg.username === actualUser ? "#333333" : "#4A2875"}
          backgroundColor={errorFlag ? "#C85050" : msg.username === actualUser ? "#4A287533" : "#F7F8FA"}
        />
      </div>

      <div className="swarm-comment__message-side">
        <div
          className={clsx("swarm-comment__message-side__name", {
            own: msg.username === actualUser,
            error: errorFlag,
          })}
        >
          <div className="swarm-comment__message-side__name__username-and-time">
            {msg.username} &nbsp;
            <div className="swarm-comment__right-side__name-and-time__time">{formatTime(msg.timestamp)}</div>
          </div>
        </div>

        <div
          className={clsx({
            "swarm-comment__message-side__text__error": errorFlag,
            "swarm-comment__message-side__text": !errorFlag && msg.username !== actualUser,
            "swarm-comment__message-side__text own": !errorFlag && msg.username === actualUser,
          })}
        >
          {msg.message}
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
