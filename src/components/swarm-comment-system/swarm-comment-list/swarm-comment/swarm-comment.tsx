import React from "react";
import { CommentRequest } from "@solarpunkltd/comment-system";
import "./swarm-comment.scss";
import AvatarMonogram from "../../../icons/AvatarMonogram/AvatarMonogram";
import { createMonogram, formatTime } from "../../../../utils/helpers";

const SwarmComment: React.FC<CommentRequest> = ({ user, data, timestamp }) => {
  return (
    <div className="swarm-comment">
      <div className="swarm-comment__left-side">
        <AvatarMonogram letters={createMonogram(user)} />
      </div>

      <div className="swarm-comment__right-side">
        <div className="swarm-comment__right-side__name-and-time">
          <p className="swarm-comment__right-side__name-and-time__username">
            {user}
          </p>
          <p className="swarm-comment__right-side__name-and-time__time">
            {formatTime(timestamp)}
          </p>
        </div>

        <p className="swarm-comment__right-side__text">{data}</p>
      </div>
    </div>
  );
};

export default SwarmComment;
