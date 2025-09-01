import { MessageData, MessageType } from "@solarpunkltd/comment-system";
import React, { ChangeEvent, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { MAX_CHARACTER_COUNT } from "../../utils/constants";
import SendIcon from "../icons/SendIcon/SendIcon";
import Loading from "../Loading/Loading";

import "./swarm-comment-input.scss";

interface SwarmCommentInputProps {
  username: string;
  topic: string;
  address: string;
  maxCharacterCount?: number;
  onSubmit: (comment: MessageData) => Promise<void>;
}

const SwarmCommentInput: React.FC<SwarmCommentInputProps> = ({
  username,
  address,
  topic,
  maxCharacterCount,
  onSubmit,
}) => {
  const [commentToSend, setCommentToSend] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !sending && commentToSend !== "") {
      sendComment();
    }
  };

  const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    const maxCharCount = maxCharacterCount || MAX_CHARACTER_COUNT;
    if (e.target.value.length > maxCharCount) {
      return;
    }
    setCommentToSend(e.target.value);
  };

  const sendComment = async () => {
    if (!commentToSend) return;

    const msgData: MessageData = {
      id: uuidv4(),
      username,
      type: MessageType.TEXT,
      address,
      index: "dummy",
      topic,
      targetMessageId: "",
      signature: "",
      flagged: false,
      reason: "",
      isLegacy: false,
      message: commentToSend,
      timestamp: Date.now(),
    };

    setSending(true);
    setCommentToSend("");
    try {
      await onSubmit(msgData);
    } catch (err) {
      console.error("Submit comment error: ", err);
    }

    setSending(false);
  };

  return (
    <div className="swarm-comment-input">
      <>
        <input
          value={commentToSend}
          onChange={e => handleOnChange(e)}
          onKeyDown={handleKeyDown}
          className="swarm-comment-input__input"
        />
        <button
          onClick={sendComment}
          className="swarm-comment-input__send-button"
          disabled={sending || commentToSend === ""}
        >
          {!sending ? commentToSend !== "" ? <SendIcon /> : <SendIcon color="#A5ADBA" disabled={true} /> : <Loading />}
        </button>
      </>
    </div>
  );
};

export default SwarmCommentInput;
