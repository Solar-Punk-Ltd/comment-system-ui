import React from "react";
// import "./swarm-comment-list.scss";
import SwarmComment from "./swarm-comment/swarm-comment";
import { Comment } from "@solarpunkltd/comment-system";

export interface SwarmCommentSystemProps {
  comments: Comment[] | null;
  loading: boolean;
}

const SwarmCommentList: React.FC<SwarmCommentSystemProps> = ({
  comments,
  loading,
}) => {
  if (!comments || comments.length === 0) {
    return (
      <div
        className="swarm-comment-system-comment-list__no-comments"
        style={{
          alignContent: "center",
          fontFamily: "Public Sans",
          fontSize: "16px",
          lineHeight: "20px",
          letterSpacing: "0.5%",
          color: "#333333",
        }}
      >
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
    <div
      className="swarm-comment-system-comment-list"
      style={{
        textAlign: "center",
        flexGrow: "1",
        overflow: "scroll",
      }}
    >
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
