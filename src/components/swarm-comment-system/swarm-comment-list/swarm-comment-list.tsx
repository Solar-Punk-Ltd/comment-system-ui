import React, { useEffect, useRef } from "react";
// import { CommentRequest } from "@solarpunkltd/comment-system";
import "./swarm-comment-list.scss";
import SwarmComment, {
  SwarmCommentWithErrorFlag,
} from "./swarm-comment/swarm-comment";

interface SwarmCommentListProps {
  comments: SwarmCommentWithErrorFlag[];
  loading: boolean;
  resend?: (comment: SwarmCommentWithErrorFlag) => Promise<void>;
}

const SwarmCommentList: React.FC<SwarmCommentListProps> = ({
  comments,
  loading,
  resend,
}) => {
  const commentListRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    alert("before");
    if (commentListRef.current) {
      alert("scrolling");
      commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
    }
  }, [comments]);

  if (!comments || comments.length === 0) {
    return (
      <div
        ref={commentListRef}
        className="swarm-comment-system-comment-list__no-comment"
      >
        {loading ? (
          <p>Loading comments...</p>
        ) : (
          <>
            <p>There are no comments yet.</p>
            <p>Start the conversation!</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="swarm-comment-system-comment-list">
      {comments.map((c, ix) => (
        <SwarmComment
          data={c.data}
          user={c.user}
          key={ix}
          timestamp={c.timestamp}
          error={c.error}
          resend={resend}
        />
      ))}
    </div>
  );
};

export default SwarmCommentList;
