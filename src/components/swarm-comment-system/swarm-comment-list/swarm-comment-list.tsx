import { FeedIndex, PrivateKey } from "@ethersphere/bee-js";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import {
  Action,
  getReactionFeedId,
  Reaction,
  ReactionsWithIndex,
  updateReactions,
  UserComment,
  writeReactionsToIndex,
} from "@solarpunkltd/comment-system";
import { useEffect, useState } from "react";

import { formatTime } from "../../../utils/helpers";
import { ReactionType, readLatestReactions } from "../../../utils/reactions";

import styles from "./swarm-comment-list.module.scss";

export interface SwarmCommentListProps {
  comments: SwarmCommentWithFlags[];
  signer: PrivateKey | undefined;
  beeApiUrl: string | undefined;
  stamp: string | undefined;
  loading: boolean;
  className?: string;
  resend?: (comment: SwarmCommentWithFlags) => Promise<void>;
}

export interface SwarmCommentWithFlags extends UserComment {
  error?: boolean;
  resend?: (comment: SwarmCommentWithFlags) => Promise<void>;
}

export default function SwarmCommentList({
  comments,
  loading,
  signer,
  beeApiUrl,
  className,
  resend,
}: SwarmCommentListProps) {
  const [sendingComment, setSendingComment] = useState<boolean>(false);
  const [sendingReaction, setSendingReaction] = useState<boolean>(false);
  const [loadReactions, setLoadReactions] = useState<boolean>(true);
  const [reactionsPerComments, setReactionsPerComments] = useState<Map<string, ReactionsWithIndex>>(new Map());

  useEffect(() => {
    if (!comments) {
      return;
    }

    // Loads reactions for each of the comments
    const loadReactionsForComments = async (commentId: string, address?: string): Promise<void> => {
      try {
        const identifier = getReactionFeedId(commentId).toString();
        const latestReactions = await readLatestReactions(undefined, identifier, address, beeApiUrl);

        if (latestReactions) {
          setReactionsPerComments(prev => prev.set(commentId, latestReactions));
        }
        console.log(`Loaded reactions for comment ID ${commentId}`);
      } catch (err) {
        console.error(`Loading for comment ID ${commentId} error: ${err}`);
      }
    };

    const waitForReactions = async (): Promise<void> => {
      setLoadReactions(true);
      for (const comment of comments) {
        if (comment.message.messageId) {
          await loadReactionsForComments(comment.message.messageId, signer?.publicKey().address().toString());
        }
      }
      setLoadReactions(false);
    };
    waitForReactions();
  }, [beeApiUrl, comments]);

  const resendComment = async (comment: SwarmCommentWithFlags) => {
    if (!resend) {
      return;
    }
    const retryComment: SwarmCommentWithFlags = {
      ...comment,
    };
    retryComment.timestamp = Date.now();

    setSendingComment(true);
    try {
      await resend(retryComment);
    } catch (err) {
      console.error("Resend comment error: ", err);
    }

    setSendingComment(false);
  };

  const mapReactions = (reactionType: ReactionType, commentId?: string): Reaction[] => {
    if (!commentId) return [];

    const reactions = reactionsPerComments.get(commentId);
    if (!reactions) return [];

    return reactions.reactions.filter(r => r.reactionType === reactionType);
  };

  const handleOnClick = async (reactionType: ReactionType, comment: UserComment): Promise<void> => {
    if (sendingReaction) return;

    const messageId = comment.message.messageId;
    if (!messageId) return;

    const reactions = reactionsPerComments.get(messageId) || {
      reactions: [],
      nextIndex: FeedIndex.fromBigInt(0n).toString(),
    };

    const newReactions = updateReactions(
      reactions.reactions,
      {
        user: comment.user,
        targetMessageId: messageId,
        timestamp: Date.now(),
        reactionType,
      },
      Action.ADD,
    );
    // TODO: doubleclcick == remove ?
    if (!newReactions) {
      console.debug("reactions not changed");
      return;
    }

    const nextIndex = new FeedIndex(reactions.nextIndex);
    const identifier = getReactionFeedId(messageId).toString();
    setSendingReaction(true);
    await writeReactionsToIndex(newReactions, nextIndex, {
      identifier,
      beeApiUrl,
      signer,
    });
    setReactionsPerComments(prev =>
      prev.set(messageId, {
        reactions: newReactions,
        nextIndex: FeedIndex.fromBigInt(nextIndex.toBigInt() + 1n).toString(),
      }),
    );
    setSendingReaction(false);
  };

  return (
    <div className={`${styles["swarm-comment-list"]} ${className}`}>
      {loading
        ? "Loading"
        : comments.map(({ user, message, timestamp, error }, index) => (
            <div className={`${styles["swarm-comment-list"]}_${className}__${message.messageId}`} key={index}>
              <p>
                <strong>{user.username}</strong> on {formatTime(timestamp)}
                <strong>{"  " + user.address.substring(0, 10)}</strong>
              </p>
              <p>{message.text}</p>
              {!error && !loadReactions ? (
                <div className={`${styles["swarm-comment-list"]}_${className}__reactions`}>
                  <div
                    className={`${styles["swarm-comment-list"]}_${className}__${ReactionType.LIKE}`}
                    onClick={() => handleOnClick(ReactionType.LIKE, { user, message, timestamp })}
                  >
                    <ThumbUpIcon />
                    {mapReactions(ReactionType.LIKE, message.messageId).length}
                  </div>
                  <div
                    className={`${styles["swarm-comment-list"]}_${className}__${ReactionType.DISLIKE}`}
                    onClick={() => handleOnClick(ReactionType.DISLIKE, { user, message, timestamp })}
                  >
                    <ThumbDownIcon />
                    {mapReactions(ReactionType.DISLIKE, message.messageId).length}
                  </div>
                </div>
              ) : null}
              {error && (
                <div className={`${styles["swarm-comment-list"]}_${className}__try-again`}>
                  <button
                    className="swarm-comment-try-again-button"
                    onClick={() => resendComment(comments[index])}
                    disabled={sendingComment}
                  >
                    Try again{" "}
                  </button>
                </div>
              )}
            </div>
          ))}
    </div>
  );
}
