import { FeedIndex, PrivateKey, Topic } from "@ethersphere/bee-js";
import { MessageData, readCommentsInRange, writeCommentToIndex } from "@solarpunkltd/comment-system";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { loadLatestComments, loadNextComments, verifyWriteSuccess } from "../../utils/comments";
import { DEFAULT_NUM_OF_COMMENTS, THREE_SECONDS } from "../../utils/constants";
import { safeConvertIndex } from "../../utils/helpers";
import SwarmCommentInput from "../swarm-comment-input/swarm-comment-input";

import { SwarmCommentWithFlags } from "./swarm-comment-list/swarm-comment/swarm-comment";
import SwarmCommentList from "./swarm-comment-list/swarm-comment-list";

import "./swarm-comment-system.scss";

/**
 * Props for the SwarmCommentSystem component.
 */
export interface SwarmCommentSystemProps {
  /**
   * Postage stamp ID. If omitted, the first available stamp will be used.
   */
  stamp: string;
  /**
   * Raw comment topic that is used as the identifier.
   */
  topic: string;
  /**
   * The URL of the Bee node.
   */
  beeApiUrl: string;
  /**
   * A Signer instance that can sign data.
   */
  signer: PrivateKey;
  /**
   * Nickname of the user.
   */
  username: string;
  /**
   * Already loaded comments to display. Does not fetch initial comments if defined.
   */
  preloadedComments?: MessageData[];
  /**
   * Maximum number of comments to load per request. Defaults to DEFAULT_NUM_OF_COMMENTS.
   */
  numOfComments?: number;
  /**
   * Maximum number of characters for a comment.
   */
  maxCharacterCount?: number;
  /**
   * Enables filtering based on the comment message flag.
   */
  filterEnabled?: boolean;
  /**
   * Callback for write events.
   * @param newComment The new comment that was written.
   * @param next The next comment index, if available.
   */
  onComment?: (newComment: MessageData, next: bigint | undefined) => void;
  /**
   * Callback for read events.
   * @param newComments The new comments that were read.
   * @param isHistory Indicates if the comments are from history.
   * @param next The next comment index, if available.
   */
  onRead?: (newComments: MessageData[], isHistory: boolean, next: bigint | undefined) => void;
}

export const SwarmCommentSystem: React.FC<SwarmCommentSystemProps> = ({
  stamp,
  topic,
  beeApiUrl,
  signer,
  username,
  preloadedComments,
  numOfComments,
  maxCharacterCount,
  filterEnabled,
  onComment,
  onRead,
}) => {
  const topicHex = Topic.fromString(topic).toString();
  const [comments, setComments] = useState<SwarmCommentWithFlags[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const approvedFeedAddress = signer.publicKey().address().toString();
  const nextRef = useRef<bigint | undefined>(undefined);
  const sendingRef = useRef<boolean | undefined>(undefined);
  const commentsToRead = numOfComments ? BigInt(numOfComments) : DEFAULT_NUM_OF_COMMENTS;

  useEffect(() => {
    // Loads comments for the given topic
    const init = async (): Promise<void> => {
      setLoading(true);

      const newComments = await loadLatestComments(topic, approvedFeedAddress, beeApiUrl, commentsToRead);

      if (newComments.length > 0) {
        setComments(newComments);
        const tmpNext = safeConvertIndex(newComments[newComments.length - 1].index);
        nextRef.current = tmpNext !== undefined ? tmpNext + 1n : 0n;
        console.debug(`Loaded ${newComments.length} comments of topic ${topic}`);
      }
      // return the newly read comments and the next index to the parent component
      if (onRead) {
        onRead(newComments, false, nextRef.current);
      }

      setLoading(false);
      sendingRef.current = false;
    };

    if (preloadedComments) {
      setLoading(true);

      console.debug(`Preloaded ${preloadedComments.length} comments of topic: ${topic}`);
      setComments(preloadedComments);
      if (preloadedComments.length > 0) {
        const tmpNext = safeConvertIndex(preloadedComments[preloadedComments.length - 1].index);
        nextRef.current = tmpNext !== undefined ? tmpNext + 1n : 0n;
      }

      setLoading(false);
      sendingRef.current = false;
    } else {
      init();
    }
  }, []);

  // Fetching comments periodically to see if we have the latest ones
  const loadNextCommentsCb = useCallback(async () => {
    if (sendingRef.current === true) {
      return;
    }

    try {
      const validNextIx = nextRef.current === undefined ? 0n : nextRef.current;
      const newComments = await loadNextComments(
        topic,
        approvedFeedAddress,
        beeApiUrl,
        validNextIx,
        DEFAULT_NUM_OF_COMMENTS,
      );

      if (sendingRef.current || newComments.length === 0) {
        return;
      }

      const nextIx = safeConvertIndex(newComments[newComments.length - 1].index);

      if (nextRef.current !== undefined && nextIx && nextIx > nextRef.current) {
        // sometimes commentcheck fails and right after the failure the comment arrives, probably due to kademlia propagation, removes duplicates
        setComments(prevComments => {
          for (const nc of newComments) {
            const foundIX = prevComments.findIndex(c => c.message === nc.message && c.id === nc.id);
            if (foundIX > -1) {
              newComments.splice(foundIX, 1);
            }
          }
          return [...prevComments].concat(newComments);
        });

        nextRef.current = nextIx;

        if (onRead) {
          onRead(newComments, false, nextIx);
        }

        console.debug(`${newComments.length} new comments arrived, next index: ${nextIx}`);
      }
    } catch (err) {
      console.error("Fetching new comments error: ", err);
    }
  }, [topic, beeApiUrl, approvedFeedAddress, onRead]);

  useEffect(() => {
    if (loading) {
      return;
    }
    const interval = setInterval(async () => {
      loadNextCommentsCb();
    }, THREE_SECONDS);

    return () => clearInterval(interval);
  }, [loading, loadNextCommentsCb]);

  // if resend is succesful then find, remove and push the currently error-flagged comment to the end of the list
  const onResend = (comment: SwarmCommentWithFlags) => {
    const foundIX = comments.findIndex(c => c.error && c.message === comment.message && c.id === comment.id);
    if (foundIX > -1) {
      console.debug(`Removing failed comment at index: ${foundIX}`);
      const tmpComments = [...comments];
      tmpComments.splice(foundIX, 1);
      tmpComments.push({
        ...comment,
        error: false,
      });
      setComments(tmpComments);
    }
  };

  // only add failed comments to the list, if not already present
  const onFailure = (comment: SwarmCommentWithFlags) => {
    const foundIX = comments.findIndex(c => c.error && c.message === comment.message && c.id === comment.id);
    if (foundIX < 0) {
      const tmpComments = [...comments];
      tmpComments.push({
        ...comment,
        error: true,
      });
      setComments(tmpComments);
    }
  };

  const sendComment = async (comment: SwarmCommentWithFlags) => {
    try {
      const expNextIx = nextRef.current === undefined ? 0n : nextRef.current;
      // Extract only MessageData fields from SwarmCommentWithFlags
      const msgData: MessageData = {
        id: comment.id,
        username,
        timestamp: Date.now(),
        index: FeedIndex.fromBigInt(expNextIx).toString(),
        type: comment.type,
        message: comment.message,
        address: comment.address,
        topic: comment.topic,
        targetMessageId: comment.targetMessageId,
        signature: comment.signature,
        flagged: comment.flagged,
        reason: comment.reason,
      };

      sendingRef.current = true;

      const newComment = await writeCommentToIndex(msgData, FeedIndex.fromBigInt(expNextIx), {
        stamp,
        identifier: topicHex,
        signer,
        beeApiUrl,
      });

      const commentCheck = await verifyWriteSuccess(
        topicHex,
        approvedFeedAddress,
        beeApiUrl,
        FeedIndex.fromBigInt(expNextIx),
        newComment,
        msgData,
      );

      console.debug(`Writing a new comment to index ${expNextIx} was successful`);
      // use filter flag set by AI, only available if reading back was successful
      comment.flagged = commentCheck.flagged;

      if (comment.error === true) {
        onResend(comment);
      } else {
        setComments(prevComments => [...prevComments, comment]);
      }
      nextRef.current = expNextIx + 1n;
      sendingRef.current = false;
      if (onComment) {
        onComment(commentCheck, expNextIx + 1n);
      }
    } catch (err) {
      onFailure(comment);
      sendingRef.current = false;
      throw err;
    }
  };

  // load previous DEFAULT_NUM_OF_COMMENTS comments up to the currently loaded first comment until the 0th comment is reached
  const loadHistory = async (): Promise<MessageData[]> => {
    if (nextRef.current !== undefined) {
      const currentStartIx = nextRef.current > comments.length ? nextRef.current - BigInt(comments.length - 1) : 0n;
      if (currentStartIx > 0n) {
        const newStartIx =
          currentStartIx > DEFAULT_NUM_OF_COMMENTS ? currentStartIx - DEFAULT_NUM_OF_COMMENTS + 1n : 0n;

        try {
          const prevComments = await readCommentsInRange(
            FeedIndex.fromBigInt(newStartIx),
            FeedIndex.fromBigInt(currentStartIx),
            {
              identifier: topicHex,
              beeApiUrl: beeApiUrl,
              address: approvedFeedAddress,
            },
          );

          if (!prevComments || prevComments.length === 0) {
            return [];
          }

          console.debug(`Loaded ${prevComments.length} previous comments from history`);

          setComments([...prevComments, ...comments]);
          if (onRead) {
            onRead(prevComments, true, nextRef.current);
          }
          return prevComments;
        } catch (err) {
          console.error("Loading comment history error: ", err);
        }
      }
    }

    return [];
  };

  return (
    <>
      <SwarmCommentList
        comments={comments}
        loading={loading}
        filterEnabled={filterEnabled || false}
        resend={sendComment}
        loadHistory={loadHistory}
      />
      {!loading && (
        <div className="swarm-comment-system__input-wrapper">
          <SwarmCommentInput
            username={username}
            topic={topic}
            address={approvedFeedAddress}
            maxCharacterCount={maxCharacterCount}
            onSubmit={sendComment}
          />
        </div>
      )}
    </>
  );
};
