import React from "react";
import "./swarm-comment-button.scss";
import clsx from "clsx";

interface SwarmCommentButtonProps {
  children: string;
  version?: "filled" | "outlined" | "inactive";
  onClick?: () => void;
}

const SwarmCommentButton: React.FC<SwarmCommentButtonProps> = ({
  children,
  version,
  onClick,
}) => {
  return (
    <button
      disabled={version === "inactive"}
      className={clsx("swarm-comment-button", {
        "swarm-comment-button--filled": version === "filled",
        "swarm-comment-button--outlined": version === "outlined",
        "swarm-comment-button--inactive": version === "inactive",
      })}
      onClick={() => (onClick ? onClick() : null)}
    >
      {children}
    </button>
  );
};

export default SwarmCommentButton;
