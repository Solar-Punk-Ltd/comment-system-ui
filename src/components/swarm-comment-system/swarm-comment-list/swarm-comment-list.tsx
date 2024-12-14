import { useState } from "react";
import { UserComment } from "@solarpunkltd/comment-system";

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
        : comments.map(({ username, message, timestamp, error }, index) => (
            <div key={index}>
              <p>
                <strong>{username}</strong> on {new Date(timestamp).toDateString()}
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
