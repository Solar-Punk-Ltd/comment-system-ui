import { useEffect, useState, useCallback, useRef } from "react";
import { Bee, Signer, Topic } from "@ethersphere/bee-js";
import {
  Comment,
  UserComment,
  CommentsWithIndex,
  writeCommentToIndex,
  readSingleComment,
  readCommentsAsync,
} from "@solarpunkltd/comment-system";
import "./swarm-comment-system.scss";
import SwarmCommentList from "./swarm-comment-list/swarm-comment-list";
import SwarmCommentInput from "../swarm-comment-input/swarm-comment-input";
import { SwarmCommentWithFlags } from "./swarm-comment-list/swarm-comment/swarm-comment";
import { loadLatestComments, loadNextComments } from "../../utils/comments";
import { isEmpty } from "../../utils/helpers";
import { DEFAULT_NUM_OF_COMMENTS, THREE_SECONDS } from "../../utils/constants";

/**
 * stamp - Postage stamp ID. If ommitted a first available stamp will be used.
 * topic - Comment topic that is used as the identifier
 * beeApiUrl - Bee API URL
 * signer - Signer object
 * username - Nickname of the user
 * preloadedCommnets - pre-loaded comments to display, does not load comments from the feed
 * numOfComments - maximum number of comments to load
 * maxCharacterCount - maximum number of characters for a comment
 * filterEnabled - enables filtering of comments
 * onComment - callback for write events
 * onRead - callback for read events
 */
export interface SwarmCommentSystemProps {
  stamp: string;
  topic: string;
  beeApiUrl: string;
  signer: Signer;
  username: string;
  preloadedCommnets?: CommentsWithIndex;
  numOfComments?: number;
  maxCharacterCount?: number;
  filterEnabled?: boolean;
  onComment?: (newComment: UserComment, next: number | undefined) => void;
  onRead?: (
    newComments: UserComment[],
    isHistory: boolean,
    next: number | undefined
  ) => void;
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

  const nextRef = useRef<number | undefined>();
  const sendingRef = useRef<boolean | undefined>();
  const commentsToRead = numOfComments || DEFAULT_NUM_OF_COMMENTS;

  useEffect(() => {
    // Loads comments for the given topic
    const init = async (): Promise<void> => {
      setLoading(true);
      try {
        const newComments = await loadLatestComments(
          stamp,
          topic,
          signer,
          beeApiUrl,
          commentsToRead
        );

        if (!isEmpty(newComments)) {
          setComments(newComments.comments);
          nextRef.current = newComments.nextIndex;
          console.log(
            `Loaded ${newComments.comments.length} comments of topic ${topic}`
          );
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
      console.log(
        `Preloaded ${preloadedCommnets.comments.length} comments of topic: ${topic}`
      );
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
        stamp,
        topic,
        signer,
        beeApiUrl,
        validNextIx,
        DEFAULT_NUM_OF_COMMENTS
      );

      if (
        !sendingRef.current &&
        !isEmpty(newComments) &&
        nextRef.current !== undefined &&
        newComments.nextIndex > nextRef.current
      ) {
        setComments((prevComments) =>
          [...prevComments].concat(newComments.comments)
        );
        nextRef.current = newComments.nextIndex;
        if (onRead) {
          onRead(newComments.comments, false, newComments.nextIndex);
        }

        console.log(
          `${newComments.comments.length} new commetns arrived, next index: ${newComments.nextIndex}`
        );
      }
    } catch (err) {
      console.error("Fetching new comments error: ", err);
    }
  }, [topic, beeApiUrl, signer, stamp, onRead]);

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
      (c) =>
        c.error &&
        c.message.text === comment.message.text &&
        c.message.messageId === comment.message.messageId
    );
    if (foundIX > -1) {
      console.log(
        `Resend success, removing failed comment at index: ${foundIX}`
      );
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
      (c) =>
        c.error &&
        c.message.text === comment.message.text &&
        c.message.messageId === comment.message.messageId
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
      const newComment = await writeCommentToIndex(plainCommentReq, {
        stamp,
        identifier: topicHex,
        signer,
        beeApiUrl,
        startIx: expNextIx,
      });

      if (isEmpty(newComment)) {
        throw "Comment write failed, empty response!";
      }
      // need to check if the comment was written successfully to the expected index
      // nexitIx will be undefined if startIx is defined
      const commentCheck = await readSingleComment({
        stamp: stamp,
        identifier: topicHex,
        signer: signer,
        beeApiUrl: beeApiUrl,
        approvedFeedAddress: signer.address as unknown as string,
        startIx: expNextIx,
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
      console.log(
        `Writing a new comment to index ${expNextIx} was successful: `,
        newComment
      );
      // use filter flag set by AI, only available if reading back was successful
      comment.message.flagged = commentCheck.comment.message.flagged;

      if (comment.error === true) {
        onResend(comment);
      } else {
        setComments((prevComments) => [...prevComments, comment]);
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
      const currentStartIx =
        nextRef.current > comments.length
          ? nextRef.current - comments.length - 1
          : 0;
      if (currentStartIx > 0) {
        const newStartIx =
          currentStartIx > DEFAULT_NUM_OF_COMMENTS
            ? currentStartIx - DEFAULT_NUM_OF_COMMENTS + 1
            : 0;

        try {
          const prevComments = await readCommentsAsync({
            stamp: stamp,
            identifier: topicHex,
            signer: signer,
            beeApiUrl: beeApiUrl,
            approvedFeedAddress: signer.address as unknown as string,
            startIx: newStartIx,
            endIx: currentStartIx,
          });
          console.log(
            `Loaded ${prevComments.length} previous comments from history`
          );
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
            maxCharacterCount={maxCharacterCount}
            onSubmit={sendComment}
          />
        </div>
      )}
    </>
  );
};
