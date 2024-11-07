import React, { useEffect, useCallback, useState } from "react";
import { UserComment } from "@solarpunkltd/comment-system";
import "./swarm-comment-list.scss";
import SwarmComment, {
  SwarmCommentWithFlags,
} from "./swarm-comment/swarm-comment";

interface SwarmCommentListProps {
  comments: SwarmCommentWithFlags[];
  loading: boolean;
  filterEnabled?: boolean;
  resend?: (comment: SwarmCommentWithFlags) => Promise<void>;
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

  useEffect(() => {
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
            <p>There are no comments yet.</p>
            <p>Start the conversation!</p>
          </>
        )}
      </div>
    );
  }

  const filteredComments = () => {
    if (filterEnabled) {
      const actualUser = localStorage.getItem("username") || "";
      return comments.filter((c) => {
        if (c.username === actualUser && c.message.flagged === true) {
          c.message.text = "Potentially infringing content hidden by USCVS!";
          c.ownFilterFlag = true;
        }
        return c.message.flagged !== true || c.ownFilterFlag;
      });
    }
    return comments;
  };

  return (
    <div ref={handleDivCb} className="swarm-comment-system-comment-list">
      {filteredComments().map((c, ix) => (
        <SwarmComment
          key={c.message.messageId || ix}
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
