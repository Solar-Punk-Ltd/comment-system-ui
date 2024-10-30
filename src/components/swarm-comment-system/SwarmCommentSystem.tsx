import { useEffect, useState, useCallback } from "react";
import { Bee, Signer, Topic } from "@ethersphere/bee-js";
import {
  Comment,
  CommentRequest,
  CommentsWithIndex,
  writeCommentToIndex,
  readSingleComment,
  readCommentsAsync,
} from "@solarpunkltd/comment-system";
import "./swarm-comment-system.scss";
import SwarmCommentList from "./swarm-comment-list/swarm-comment-list";
import SwarmCommentInput from "../swarm-comment-input/swarm-comment-input";
import { SwarmCommentWithErrorFlag } from "./swarm-comment-list/swarm-comment/swarm-comment";
import { loadLatestComments, loadNextComments } from "../../utils/loadComments";
import { isEmpty } from "../../utils/helpers";
import {
  DEFAULT_NEW_COMMENTS_TO_READ,
  DEFAULT_NUM_OF_COMMENTS,
  TEN_SECONDS,
} from "../../utils/constants";

/**
 * stamp - Postage stamp ID. If ommitted a first available stamp will be used.
 * topic - Comment topic that is used as the identifier
 * beeApiUrl - Bee API URL
 * signer - Signer object
 * username - Nickname of the user
 * preloadedCommnets - pre-loaded comments to display, does not load comments from the feed
 * numOfComments - maximum number of comments to load
 * maxCharacterCount - maximum number of characters for a comment
 * onComment - callback for comment events
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
  onComment?: (newComment: Comment, next: number | undefined) => void;
  onRead?: (
    newComments: Comment[],
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
  onComment,
  onRead,
}) => {
  const bee = new Bee(beeApiUrl);
  const topicHex: Topic = bee.makeFeedTopic(topic);
  const [comments, setComments] = useState<SwarmCommentWithErrorFlag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [currentNextIx, setCurrentNextIx] = useState<number | undefined>(
    undefined
  );

  const commentsToRead = numOfComments || DEFAULT_NUM_OF_COMMENTS;

  // Will load comments for the given topic (which is the room-name)
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

      if (isEmpty(newComments)) {
        if (onRead) {
          onRead([], false, undefined);
        }
      } else {
        updateCommentList(newComments);
      }
    } catch (err) {
      console.log("loading comments error: ", err);
    }
    setLoading(false);
  };

  const updateCommentList = (newComments: CommentsWithIndex) => {
    if (!isEmpty(newComments)) {
      if (!loading) {
        setComments((prevComments) =>
          [...prevComments].concat(newComments.comments)
        );
      } else {
        setComments([...comments].concat(newComments.comments));
      }
      console.log(
        "updated comment list with new comments: ",
        newComments.comments
      );
      setCurrentNextIx(newComments.nextIndex);
      // return the newly read comments and the next index to the parent component
      if (onRead) {
        onRead(newComments.comments, false, newComments.nextIndex);
      }
    }
  };

  // if resend is succesful then find, remove and push the currently error-flagged comment to the end of the list
  const onResend = (comment: SwarmCommentWithErrorFlag) => {
    const foundIX = comments.findIndex(
      (c) => c.error && c.data === comment.data && c.id === comment.id
    );
    if (foundIX > -1) {
      console.log(
        `found error-flagged comment at index: ${foundIX}, removing it...`
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
  const onFailure = (comment: SwarmCommentWithErrorFlag) => {
    const foundIX = comments.findIndex(
      (c) => c.error && c.data === comment.data && c.id === comment.id
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

  const sendComment = async (comment: SwarmCommentWithErrorFlag) => {
    setSending(true);
    try {
      // trying to write to the next known index
      const expNextIx = currentNextIx === undefined ? 0 : currentNextIx;
      const plainCommentReq: CommentRequest = {
        data: comment.data,
        timestamp: comment.timestamp,
        user: comment.user,
        id: comment.id,
        tags: comment.tags,
        replyId: comment.replyId,
      };
      const newComment = await writeCommentToIndex(plainCommentReq, {
        stamp,
        identifier: topicHex,
        signer,
        beeApiUrl,
        startIx: expNextIx,
      });

      if (!newComment || Array.from(Object.keys(newComment)).length === 0) {
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
        commentCheck.comment.data !== comment.data ||
        commentCheck.comment.timestamp !== comment.timestamp
      ) {
        // if another comment is found at the expected index then updateNextCommentsCb shall find it and update the list
        throw `comment check failed, expected "${comment.data}", got: "${commentCheck.comment.data}".
                Expected timestamp: ${comment.timestamp}, got: ${commentCheck.comment.timestamp}`;
      }
      console.log(
        `Writing a new comment to index ${expNextIx} was successful: `,
        newComment
      );

      if (comment.error === true) {
        onResend(comment);
      } else {
        setComments((prevComments) => [...prevComments, comment]);
      }
      setCurrentNextIx(expNextIx + 1);
      if (onComment) {
        onComment(newComment, expNextIx + 1);
      }
    } catch (err) {
      onFailure(comment);
      setSending(false);
      throw err;
    }
    setSending(false);
  };

  // loading new comments in every 10 seconds
  const updateNextCommentsCb = useCallback(async () => {
    if (loading || sending) {
      return;
    }
    try {
      const newComments = await loadNextComments(
        stamp,
        topic,
        signer,
        beeApiUrl,
        currentNextIx,
        DEFAULT_NEW_COMMENTS_TO_READ
      );

      const validNextIx = currentNextIx === undefined ? 0 : currentNextIx;
      if (!isEmpty(newComments) && newComments.nextIndex > validNextIx) {
        updateCommentList(newComments);
        console.log(
          `${newComments.comments.length} new commetns arrived, list is updated, new next index: ${newComments.nextIndex}`
        );
      }
    } catch (err) {
      console.log("fetching new comments error: ", err);
    }
  }, [currentNextIx, loading, sending]);

  useEffect(() => {
    if (preloadedCommnets) {
      setLoading(true);
      console.log(`preloading comments for topic: ${topic}`);
      setComments(preloadedCommnets.comments);
      setCurrentNextIx(preloadedCommnets.nextIndex);
      setLoading(false);
    } else {
      init();
    }
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }
    const interval = setInterval(async () => {
      updateNextCommentsCb();
    }, TEN_SECONDS);

    return () => clearInterval(interval);
  }, [loading, updateNextCommentsCb]);

  // load previous DEFAULT_NUM_OF_COMMENTS comments up to the currently loaded first comment until the 0th comment is reached
  const loadHistory = async (): Promise<CommentRequest[]> => {
    if (currentNextIx !== undefined) {
      const currentStartIx =
        currentNextIx > comments.length
          ? currentNextIx - comments.length - 1
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
            `loaded ${prevComments.length} previous comments from history`
          );
          setComments([...prevComments, ...comments]);
          if (onRead) {
            onRead(prevComments, true, currentNextIx);
          }
          return prevComments;
        } catch (error) {
          console.log("loading comment history error: ", error);
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
