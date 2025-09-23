import { MessageData } from "@solarpunkltd/comment-system";
import React, { useCallback, useEffect, useState } from "react";

import SwarmComment, { SwarmCommentWithFlags } from "./swarm-comment/swarm-comment";

import "./swarm-comment-list.scss";

interface SwarmCommentListProps {
  actualUser: string;
  comments: SwarmCommentWithFlags[];
  loading: boolean;
  resend?: (comment: SwarmCommentWithFlags) => Promise<void>;
  loadHistory?: () => Promise<MessageData[]>;
}

const SwarmCommentList: React.FC<SwarmCommentListProps> = ({ actualUser, comments, loading, resend, loadHistory }) => {
  const [autoscroll, setAutoscroll] = useState(true);
  const [isAtTop, setIsAtTop] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [element, setElement] = useState<HTMLDivElement | null>();

  const handleDivCb = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      setElement(node);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (element) {
        const { scrollTop, scrollHeight, clientHeight } = element;

        if (scrollTop + clientHeight < scrollHeight) {
          setAutoscroll(false);
        } else {
          setAutoscroll(true);
        }

        // Check if scroll has reached the top
        if (scrollTop === 0) {
          setIsAtTop(true);
        } else {
          setIsAtTop(false);
        }
      }
    };

    if (element) {
      element.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (element) {
        element.removeEventListener("scroll", handleScroll);
      }
    };
  }, [element]);

  useEffect(() => {
    if (element && autoscroll) {
      element.scrollTop = element.scrollHeight;
    }
  }, [element, autoscroll, comments]);

  useEffect(() => {
    const handleHistoryLoad = async () => {
      if (loadHistory) {
        setLoadingHistory(true);
        const prevComments = await loadHistory();
        // after loading history, scroll down
        if (element) {
          const { scrollTop } = element;
          if (scrollTop === 0) {
            const defaultCommentHeight = 78 + 40; // with 40px gap TODO: proper calculation
            element.scrollTop = prevComments.length * defaultCommentHeight;
            setIsAtTop(false);
          }
        }
        setLoadingHistory(false);
      }
    };

    if (isAtTop && !loadingHistory) {
      handleHistoryLoad();
    }
  }, [element, isAtTop, loadingHistory, loadHistory]);

  if (!comments || comments.length === 0) {
    return (
      <div className="swarm-comment-system-comment-list__no-comment">
        {loading ? (
          <p>Loading comments...</p>
        ) : (
          <>
            <p>Start the conversation!</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div ref={handleDivCb} className="swarm-comment-system-comment-list">
      {comments.map((c, ix) => (
        <SwarmComment
          key={c?.id + String(ix)}
          actualUser={actualUser}
          msg={{
            ...c,
            resend,
          }}
        />
      ))}
    </div>
  );
};

export default SwarmCommentList;
