import React, { useEffect, useCallback, useState } from "react";
import { UserComment } from "@solarpunkltd/comment-system";
import "./swarm-comment-list.scss";
import SwarmComment, {
  SwarmCommentWithErrorFlag,
} from "./swarm-comment/swarm-comment";

interface SwarmCommentListProps {
  comments: SwarmCommentWithErrorFlag[];
  loading: boolean;
  filterEnabled?: boolean;
  resend?: (comment: SwarmCommentWithErrorFlag) => Promise<void>;
  loadHistory?: () => Promise<UserComment[]>;
}

const SwarmCommentList: React.FC<SwarmCommentListProps> = ({
  comments,
  loading,
  filterEnabled,
  resend,
  loadHistory,
}) => {
  const [autoscroll, setAutoscroll] = useState(true);
  const [isAtTop, setIsAtTop] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [element, setElement] = useState<HTMLDivElement | null>();

  const handleDivCb = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      setElement(node);
    }
  }, []);

  // TODO: loading icon
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

  useEffect(() => {
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
  }, [comments]);

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
  }, [isAtTop, loadingHistory, loadHistory]);

  if (!comments || comments.length === 0) {
    return (
      <div className="swarm-comment-system-comment-list__no-comment">
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

  const filteredComments = () => {
    if (filterEnabled) {
      return comments.filter((c) => c.message.flagged !== true);
    }
    return comments;
  };

  return (
    <div ref={handleDivCb} className="swarm-comment-system-comment-list">
      {filteredComments().map((c, ix) => (
        <SwarmComment
          key={ix}
          message={{ text: c.message.text }}
          username={c.username}
          timestamp={c.timestamp}
          error={c.error}
          resend={resend}
        />
      ))}
    </div>
  );
};

export default SwarmCommentList;
