import { useState } from "react";
import { UserComment } from "@solarpunkltd/comment-system";

import { formatTime } from "../../../utils/helpers";

import styles from "./swarm-comment-list.module.scss";

export interface SwarmCommentListProps {
  comments: SwarmCommentWithFlags[];
  loading: boolean;
  className?: string;
  resend?: (comment: SwarmCommentWithFlags) => Promise<void>;
}

export interface SwarmCommentWithFlags extends UserComment {
  error?: boolean;
  resend?: (comment: SwarmCommentWithFlags) => Promise<void>;
}

export default function SwarmCommentList({ comments, loading, className, resend }: SwarmCommentListProps) {
  const [sending, setSending] = useState<boolean>(false);

  const resendComment = async (comment: SwarmCommentWithFlags) => {
    if (!resend) {
      return;
    }
    const retryComment: SwarmCommentWithFlags = {
      ...comment,
    };
    retryComment.timestamp = Date.now();

    setSending(true);
    try {
      await resend(retryComment);
    } catch (err) {
      console.error("Resend comment error: ", err);
    }

    setSending(false);
  };

  return (
    <div className={`${styles.swarmCommentList} ${className}`}>
      {loading
        ? "Loading"
        : comments.map(({ user, message, timestamp, error }, index) => (
            <div key={index}>
              <p>
                <strong>{user.username}</strong> on {formatTime(timestamp)}
                <strong>{user.address}</strong>
              </p>
              <p>{message.text}</p>
              {error && (
                <div className={`${styles.swarmCommentList}_${className}__try-again`}>
                  <button
                    className="swarm-comment-try-again-button"
                    onClick={() => resendComment(comments[index])}
                    disabled={sending}
                  >
                    Try again{" "}
                  </button>
                </div>
              )}
            </div>
          ))}
    </div>
  );
}
