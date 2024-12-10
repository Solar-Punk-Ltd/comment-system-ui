import { useCallback, useEffect, useRef, useState } from "react";
import { Bee, Signer, Topic, Utils } from "@ethersphere/bee-js";
import {
  Comment,
  CommentsWithIndex,
  readCommentsInRange,
  readSingleComment,
  UserComment,
  writeCommentToIndex,
} from "@solarpunkltd/comment-system";

import { loadLatestComments, loadNextComments } from "../../utils/comments";
import { DEFAULT_NUM_OF_COMMENTS, REFERENCE_HEX_LENGTH, THREE_SECONDS } from "../../utils/constants";
import { isEmpty } from "../../utils/helpers";
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
  signer: Signer;
  /**
   * Nickname of the user.
   */
  username: string;
  /**
   * Already loaded comments to display. Does not fetch initial comments if defined.
   */
  preloadedCommnets?: CommentsWithIndex;
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
  onComment?: (newComment: UserComment, next: number | undefined) => void;
  /**
   * Callback for read events.
   * @param newComments The new comments that were read.
   * @param isHistory Indicates if the comments are from history.
   * @param next The next comment index, if available.
   */
  onRead?: (newComments: UserComment[], isHistory: boolean, next: number | undefined) => void;
}

export const SwarmCommentSystem: React.FC<SwarmCommentSystemProps> = ({
  stamp,
  topic,
  beeApiUrl,
  signer,
  username,
  preloadedCommnets,
  numOfComments,
  maxCharacterCount,
  filterEnabled,
  onComment,
  onRead,
}) => {
  const bee = new Bee(beeApiUrl);
  const topicHex: Topic = bee.makeFeedTopic(topic);
  const [comments, setComments] = useState<SwarmCommentWithFlags[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const approvedFeedAddress = Utils.makeHexString(signer.address, REFERENCE_HEX_LENGTH);
  const nextRef = useRef<number | undefined>();
  const sendingRef = useRef<boolean | undefined>();
  const commentsToRead = numOfComments || DEFAULT_NUM_OF_COMMENTS;

  useEffect(() => {
    // Loads comments for the given topic
    const init = async (): Promise<void> => {
      setLoading(true);
      try {
        const newComments = await loadLatestComments(topic, approvedFeedAddress, beeApiUrl, commentsToRead);

        if (!isEmpty(newComments)) {
          setComments(newComments.comments);
          nextRef.current = newComments.nextIndex;
          console.log(`Loaded ${newComments.comments.length} comments of topic ${topic}`);
        }
        // return the newly read comments and the next index to the parent component
        if (onRead) {
          onRead(newComments.comments || [], false, newComments.nextIndex);
        }
      } catch (err) {
        console.error("Loading comments error: ", err);
      }
      setLoading(false);
      sendingRef.current = false;
    };

    if (preloadedCommnets) {
      setLoading(true);
      console.log(`Preloaded ${preloadedCommnets.comments.length} comments of topic: ${topic}`);
      setComments(preloadedCommnets.comments);
      nextRef.current = preloadedCommnets.nextIndex;
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
      const validNextIx = nextRef.current === undefined ? 0 : nextRef.current;
      const newComments = await loadNextComments(
        topic,
        approvedFeedAddress,
        beeApiUrl,
        validNextIx,
        DEFAULT_NUM_OF_COMMENTS,
      );

      if (
        !sendingRef.current &&
        !isEmpty(newComments) &&
        nextRef.current !== undefined &&
        newComments.nextIndex > nextRef.current
      ) {
        // sometimes commentcheck fails and right after the failure the comment arrives, probably due to kademlia propagation, removes duplicates
        setComments(prevComments => {
          for (const nc of newComments.comments) {
            const foundIX = prevComments.findIndex(
              c => c.message.text === nc.message.text && c.message.messageId === nc.message.messageId,
            );
            if (foundIX > -1) {
              newComments.comments.splice(foundIX, 1);
            }
          }
          return [...prevComments].concat(newComments.comments);
        });
        nextRef.current = newComments.nextIndex;
        if (onRead) {
          onRead(newComments.comments, false, newComments.nextIndex);
        }

        console.log(`${newComments.comments.length} new commetns arrived, next index: ${newComments.nextIndex}`);
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
    const foundIX = comments.findIndex(
      c => c.error && c.message.text === comment.message.text && c.message.messageId === comment.message.messageId,
    );
    if (foundIX > -1) {
      console.log(`Removing failed comment at index: ${foundIX}`);
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
    const foundIX = comments.findIndex(
      c => c.error && c.message.text === comment.message.text && c.message.messageId === comment.message.messageId,
    );
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
      // trying to write to the next known index
      const expNextIx = nextRef.current === undefined ? 0 : nextRef.current;
      const commentObj: Comment = {
        text: comment.message.text,
        messageId: comment.message.messageId,
        threadId: comment.message.threadId,
      };
      const plainCommentReq: UserComment = {
        message: commentObj,
        timestamp: comment.timestamp,
        username: comment.username,
      };
      sendingRef.current = true;
      const newComment = await writeCommentToIndex(plainCommentReq, expNextIx, {
        stamp,
        identifier: topicHex,
        signer,
        beeApiUrl,
      });

      if (isEmpty(newComment)) {
        throw "Comment write failed, empty response!";
      }
      // need to check if the comment was written successfully to the expected index
      // nexitIx will be undefined if startIx is defined
      const commentCheck = await readSingleComment(expNextIx, {
        identifier: topicHex,
        beeApiUrl: beeApiUrl,
        approvedFeedAddress: approvedFeedAddress,
      });
      if (
        !commentCheck ||
        commentCheck.comment.message.text !== comment.message.text ||
        commentCheck.comment.timestamp !== comment.timestamp
      ) {
        // if another comment is found at the expected index then updateNextCommentsCb shall find it and update the list
        throw `comment check failed, expected "${comment.message.text}", got: "${commentCheck.comment.message.text}".
                Expected timestamp: ${comment.timestamp}, got: ${commentCheck.comment.timestamp}`;
      }
      console.log(`Writing a new comment to index ${expNextIx} was successful: `, newComment);
      // use filter flag set by AI, only available if reading back was successful
      comment.message.flagged = commentCheck.comment.message.flagged;

      if (comment.error === true) {
        onResend(comment);
      } else {
        setComments(prevComments => [...prevComments, comment]);
      }
      nextRef.current = expNextIx + 1;
      sendingRef.current = false;
      if (onComment) {
        onComment(newComment, expNextIx + 1);
      }
    } catch (err) {
      onFailure(comment);
      sendingRef.current = false;
      throw err;
    }
  };

  // load previous DEFAULT_NUM_OF_COMMENTS comments up to the currently loaded first comment until the 0th comment is reached
  const loadHistory = async (): Promise<UserComment[]> => {
    if (nextRef.current !== undefined) {
      const currentStartIx = nextRef.current > comments.length ? nextRef.current - comments.length - 1 : 0;
      if (currentStartIx > 0) {
        const newStartIx = currentStartIx > DEFAULT_NUM_OF_COMMENTS ? currentStartIx - DEFAULT_NUM_OF_COMMENTS + 1 : 0;

        try {
          const prevComments = await readCommentsInRange(newStartIx, currentStartIx, {
            identifier: topicHex,
            beeApiUrl: beeApiUrl,
            approvedFeedAddress: approvedFeedAddress,
          });
          console.log(`Loaded ${prevComments.length} previous comments from history`);
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
          <SwarmCommentInput username={username} maxCharacterCount={maxCharacterCount} onSubmit={sendComment} />
        </div>
      )}
    </>
  );
};
