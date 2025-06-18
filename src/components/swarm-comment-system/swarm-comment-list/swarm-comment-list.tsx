import { FeedIndex, PrivateKey } from "@ethersphere/bee-js";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import {
  Action,
  getReactionFeedId,
  Reaction,
  ReactionsWithIndex,
  updateReactions,
  User,
  UserComment,
  writeReactionsToIndex,
} from "@solarpunkltd/comment-system";
import { useEffect, useState } from "react";

import { formatTime } from "../../../utils/helpers";
import { ReactionType, readReactionsState } from "../../../utils/reactions";

import styles from "./swarm-comment-list.module.scss";

export interface SwarmCommentListProps {
  comments: SwarmCommentWithFlags[];
  signer: PrivateKey | undefined;
  beeApiUrl: string | undefined;
  stamp: string | undefined;
  loading: boolean;
  identifier?: string;
  className?: string;
  resend?: (comment: SwarmCommentWithFlags) => Promise<void>;
}

export interface SwarmCommentWithFlags extends UserComment {
  error?: boolean;
  resend?: (comment: SwarmCommentWithFlags) => Promise<void>;
}

const reactionsClassName = "reactions";

export default function SwarmCommentList({
  comments,
  loading,
  signer,
  identifier,
  beeApiUrl,
  stamp,
  className,
  resend,
}: SwarmCommentListProps) {
  const [currentUser, setCurrentUser] = useState<User | undefined>(undefined);
  const [sendingComment, setSendingComment] = useState<boolean>(false);
  const [sendingReaction, setSendingReaction] = useState<boolean>(false);
  const [loadReactions, setLoadReactions] = useState<boolean>(true);
  const [reactionsPerComments, setReactionsPerComments] = useState<Map<string, Reaction[]>>(new Map());
  const [nextIndex, setNextIndex] = useState<FeedIndex | undefined>(undefined);

  const reactionFeedId = getReactionFeedId(identifier).toString();

  useEffect(() => {
    const userItem = localStorage.getItem("user");
    if (userItem) {
      const parsedUser = JSON.parse(userItem);
      setCurrentUser({ username: parsedUser.username, address: parsedUser.address });
    }
  }, []);

  useEffect(() => {
    if (!comments) {
      return;
    }

    // Loads reactions for each of the comments
    const loadReactionsForComments = async (address?: string): Promise<void> => {
      try {
        const latestReactions = await readReactionsState(nextIndex, reactionFeedId, address, beeApiUrl);

        if (latestReactions) {
          setNextIndex(new FeedIndex(latestReactions.nextIndex));

          for (const comment of comments) {
            const commentId = comment.message.messageId;
            if (!commentId) {
              console.debug("Comment ID is missing, skipping reaction loading for this comment.");
              continue;
            }

            const foundReactions = latestReactions.reactions.filter(r => r.targetMessageId === commentId);
            if (foundReactions.length > 0) {
              setReactionsPerComments(prev => prev.set(commentId, foundReactions));
              console.debug(`Loaded reactions for comment ID ${commentId}`);
            }
          }
        }
      } catch (err) {
        console.error(`Loading reactions error: ${err}`);
      }
    };

    const waitForReactions = async (): Promise<void> => {
      setLoadReactions(true);
      await loadReactionsForComments(signer?.publicKey().address().toString());
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

    return reactions.filter(r => r.reactionType === reactionType);
  };

  const handleOnClick = async (reactionType: ReactionType, comment: UserComment): Promise<void> => {
    if (!currentUser) {
      console.error("User not found");
      return;
    }

    if (sendingReaction) {
      console.debug("Already sending a reaction");
      return;
    }

    const messageId = comment.message.messageId;
    if (!messageId) {
      console.debug("Message ID is missing");
      return;
    }

    const reactionsOfComment = reactionsPerComments.get(messageId) || [];
    // TODO: rework update logic
    const existingReaction = reactionsOfComment.filter(
      r =>
        r.reactionType === reactionType && r.user.address === currentUser?.address && r.targetMessageId === messageId,
    );
    const action = existingReaction ? Action.REMOVE : Action.ADD;
    const newReactions = updateReactions(
      reactionsOfComment,
      {
        user: currentUser,
        targetMessageId: messageId,
        timestamp: Date.now(),
        reactionType,
      },
      action,
    );

    if (newReactions === undefined) {
      console.debug("Reactions did not change");
      return;
    }

    setSendingReaction(true);
    await writeReactionsToIndex(newReactions, nextIndex, {
      identifier: reactionFeedId,
      beeApiUrl,
      signer,
      stamp,
    });
    setSendingReaction(false);

    const newIndex = nextIndex === undefined ? 0n : nextIndex.toBigInt() + 1n;
    setReactionsPerComments(prev => prev.set(messageId, newReactions));
    setNextIndex(FeedIndex.fromBigInt(newIndex));
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
                <div className={`${styles["swarm-comment-list"]}__${reactionsClassName}`}>
                  <div
                    className={`${styles["swarm-comment-list"]}__${reactionsClassName}_${ReactionType.LIKE}`}
                    onClick={() => handleOnClick(ReactionType.LIKE, { user, message, timestamp })}
                  >
                    <ThumbUpIcon />
                    {mapReactions(ReactionType.LIKE, message.messageId).length}
                  </div>
                  <div
                    className={`${styles["swarm-comment-list"]}__${reactionsClassName}_${ReactionType.DISLIKE}`}
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
