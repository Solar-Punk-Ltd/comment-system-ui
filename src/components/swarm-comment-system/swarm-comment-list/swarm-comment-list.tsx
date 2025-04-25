import { useEffect, useState } from "react";
import { FeedIndex, PrivateKey } from "@ethersphere/bee-js";
import {
  getReactionFeedId,
  Reaction,
  ReactionsWithIndex,
  UserComment,
  writeReactionsToIndex,
} from "@solarpunkltd/comment-system";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";

import { formatTime } from "../../../utils/helpers";

import styles from "./swarm-comment-list.module.scss";
import { readLatestReactions } from "../../../utils/reactions";

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

enum ReactionType {
  LIKE = "like",
  DISLIKE = "dislike",
}

export default function SwarmCommentList({
  comments,
  loading,
  signer,
  beeApiUrl,
  className,
  resend,
}: SwarmCommentListProps) {
  const [sending, setSending] = useState<boolean>(false);
  const [loadReactions, setLoadReactions] = useState<boolean>(true);
  const [reactionsPerComments, setReactionsPerComments] = useState<Map<string, ReactionsWithIndex>>(new Map());

  useEffect(() => {
    if (!comments) {
      return;
    }

    // Loads reactions for each of the comments
    const loadReactionsForComments = async (commentId: string, userAddress: string): Promise<void> => {
      try {
        const reactionFeedId = getReactionFeedId(commentId);
        const latestReactions = await readLatestReactions(undefined, reactionFeedId.toString(), userAddress, beeApiUrl);
        console.log("bagoy latestReactions  : ", latestReactions);

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
          await loadReactionsForComments(comment.message.messageId, comment.user.address);
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

    setSending(true);
    try {
      await resend(retryComment);
    } catch (err) {
      console.error("Resend comment error: ", err);
    }

    setSending(false);
  };

  const mapReactions = (reactionType: ReactionType, commentId?: string): Reaction[] => {
    if (!commentId) return [];

    const reactions = reactionsPerComments.get(commentId);
    if (!reactions) return [];

    return reactions.reactions.filter(r => r.reactionType === reactionType);
  };

  const handleOnlick = async (reactionType: ReactionType, comment: UserComment): Promise<void> => {
    const messageId = comment.message.messageId;
    if (!messageId) return;

    const reactions = reactionsPerComments.get(messageId) || {
      reactions: [],
      nextIndex: FeedIndex.fromBigInt(0n).toString(),
    };
    console.log("bagoy handleOnlick reactions: ", reactions);

    const newReactions: Reaction[] = [
      ...reactions.reactions,
      {
        user: comment.user,
        targetMessageId: messageId,
        timestamp: Date.now(),
        reactionType,
      },
    ];
    const nextIndex = new FeedIndex(reactions.nextIndex);
    await writeReactionsToIndex(newReactions, nextIndex, {
      identifier: messageId,
      beeApiUrl,
      signer,
    });
    setReactionsPerComments(prev =>
      prev.set(messageId, {
        reactions: newReactions,
        nextIndex: FeedIndex.fromBigInt(nextIndex.toBigInt() + 1n).toString(),
      }),
    );
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
                    onClick={() => handleOnlick(ReactionType.LIKE, { user, message, timestamp })}
                  >
                    <ThumbUpIcon />
                    {mapReactions(ReactionType.LIKE, message.messageId).length}
                  </div>
                  <div
                    className={`${styles["swarm-comment-list"]}_${className}__${ReactionType.DISLIKE}`}
                    onClick={() => handleOnlick(ReactionType.DISLIKE, { user, message, timestamp })}
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
                    disabled={sending}
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
