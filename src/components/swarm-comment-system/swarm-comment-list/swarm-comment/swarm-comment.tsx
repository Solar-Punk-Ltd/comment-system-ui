import React from "react";
// import "./swarm-comment.scss";
// import LikeIcon from "../../icons/LikeIcon/LikeIcon";
// import LikeIconFilled from "../../icons/LikeIconFilled/LikeIconFilled";
import AvatarMonogram from "../../../icons/AvatarMonogram/AvatarMonogram";
import { createMonogram, formatTime } from "../../../../utils/helpers";
import { CommentRequest } from "@solarpunkltd/comment-system";

const SwarmComment: React.FC<CommentRequest> = ({ user, data, timestamp }) => {
  return (
    <div
      className="swarm-comment"
      style={{
        marginLeft: parent ? "32px" : undefined,
        display: "flex",
        flexDirection: "row",
        gap: "8px",
        margin: "12px",
      }}
    >
      <div
        className="swarm-comment__left-side"
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <AvatarMonogram letters={createMonogram(user)} />
      </div>

      <div
        className="swarm-comment__right-side"
        style={{
          display: "flex",
          gap: "6px",
          flexGrow: "1",
          flexDirection: "column",
          justifyContent: "left",
          textAlign: "left",
          // p { margin: "0", }
        }}
      >
        <div
          className="swarm-comment__right-side__name-and-time"
          style={{
            display: "flex",
            flexDirection: "row",
            lineHeight: "20px",
            color: "var(--text-terniary)",
            fontFamily: "Inter",
            fontSize: "12px",
          }}
        >
          <p
            className="swarm-comment__right-side__name-and-time__username"
            style={{
              fontFamily: "Inter",
              fontSize: "12px",
            }}
          >
            {user}
          </p>
          {true && (
            <p
              className="swarm-comment__right-side__name-and-time__time"
              style={{
                fontFamily: "Public Sans, Inter",
                fontSize: "12px",
                marginLeft: "16px !important",
              }}
            >
              {formatTime(timestamp)}
            </p>
          )}
        </div>

        <p
          className="swarm-comment__right-side__text"
          style={{
            backgroundColor: "var(--primary-grey)",
            border: "1px solid #e1dde9",
            borderBottomLeftRadius: "8px",
            borderTopLeftRadius: "8px",
            borderTopRightRadius: "8px",
            padding: "8px",
            fontFamily: "Inter",
            fontSize: "12px",
            color: "#000000",
            lineHeight: "20px",
            letterSpacing: "0.5%",
          }}
        >
          {data}
        </p>

        <div
          className="swarm-comment__right-side__swarm-comment-controls"
          onClick={() => null}
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {" "}
        </div>
      </div>
    </div>
  );
};

export default SwarmComment;
