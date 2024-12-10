import { UserComment } from "@solarpunkltd/comment-system";

import styles from "./swarm-comment-list.module.scss";

export interface SwarmCommentListProps {
  comments: SwarmCommentWithFlags[];
  className?: string;
}

export interface SwarmCommentWithFlags extends UserComment {
  error?: boolean;
  resend?: (comment: SwarmCommentWithFlags) => Promise<void>;
}

export default function SwarmCommentList({ comments, className }: SwarmCommentListProps) {
  return (
    <div className={`${styles.swarmCommentList} ${className}`}>
      {comments.map(({ username, message, timestamp }, index) => (
        <div key={index}>
          <p>
            <strong>{username}</strong> on {new Date(timestamp).toDateString()}
          </p>
          <p>{message.text}</p>
        </div>
      ))}
    </div>
  );
}
