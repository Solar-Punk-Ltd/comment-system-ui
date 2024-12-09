import React from "react";

import SwarmCommentButton from "./swarm-comment-button/swarm-comment-button";

import "./swarm-comment-popup.scss";

interface SwarmCommentPopupProps {
  question: string;
  leftButtonText: string;
  leftButtonHandler: () => void;
  rightButtonText: string;
  rightButtonHandler: () => void;
}

const SwarmCommentPopup: React.FC<SwarmCommentPopupProps> = ({
  question,
  leftButtonText,
  leftButtonHandler,
  rightButtonText,
  rightButtonHandler,
}) => {
  return (
    <div className="swarm-comment-popup">
      <div className="swarm-comment-popup__content">
        <div className="swarm-comment-popup__header">{question}</div>
        <div className="swarm-comment-popup__buttons">
          <SwarmCommentButton onClick={leftButtonHandler} version="outlined">
            {leftButtonText}
          </SwarmCommentButton>
          <SwarmCommentButton onClick={rightButtonHandler} version="filled">
            {rightButtonText}
          </SwarmCommentButton>
        </div>
      </div>
    </div>
  );
};

export default SwarmCommentPopup;
