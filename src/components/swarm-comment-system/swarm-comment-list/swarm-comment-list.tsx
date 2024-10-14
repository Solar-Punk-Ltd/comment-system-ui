import React from "react";
import { Comment } from "@solarpunkltd/comment-system";
import "./swarm-comment-list.scss";
import SwarmComment from "./swarm-comment/swarm-comment";

interface SwarmCommentListProps {
  comments: Comment[];
  loading: boolean;
}

const SwarmCommentList: React.FC<SwarmCommentListProps> = ({
  comments,
  loading,
}) => {
  if (!comments || comments.length === 0) {
    return (
      <div className="swarm-comment-system-comment-list__no-comment">
        {loading ? (
          <p>Loading comments...</p>
        ) : (
          <>
            <p>There are no comments yet.</p>
            <p>Start the conversation!"</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="swarm-comment-system-comment-list">
      {comments.map((msg, ix) => (
        <SwarmComment
          data={msg.data}
          user={msg.user}
          key={ix}
          timestamp={msg.timestamp}
        />
      ))}
    </div>
  );
};

export default SwarmCommentList;
