import { useEffect, useState, useCallback } from "react";
import { Bee, Signer, Topic } from "@ethersphere/bee-js";
import {
  Comment,
  CommentRequest,
  CommentsWithIndex,
  writeCommentToIndex,
  readSingleComment,
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
 * startIx - start index to load comments in the feed
 * endIx -  end index for loading comments in the feed
 * onComment - callback for comment events
 * onRead - callback for read events
 */
export interface SwarmCommentSystemProps {
  stamp: string;
  topic: string;
  beeApiUrl: string;
  signer: Signer;
  username: string;
  preloadedCommnets?: Comment[];
  numOfComments?: number;
  maxCharacterCount?: number;
  startIx?: number;
  endIx?: number;
  onComment?: (newComment: Comment) => void;
  onRead?: (newComments: Comment[], end: number) => void;
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
  startIx,
  endIx,
  onComment,
  onRead,
}) => {
  const bee = new Bee(beeApiUrl);
  const topicHex: Topic = bee.makeFeedTopic(topic);
  const [comments, setComments] = useState<SwarmCommentWithErrorFlag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [currentStartIx, setCurrentStartIx] = useState<number | undefined>(
    startIx
  );
  const [currentEndIx, setCurrentEndIx] = useState<number | undefined>(endIx);

  const commentsToRead = numOfComments || DEFAULT_NUM_OF_COMMENTS;

  /** If the room already exists, it will load the comments,
   *  otherwise, it will create the room */
  async function init() {
    await loadComments();
  }

  useEffect(() => {
    if (preloadedCommnets) {
      console.log(`preloading comments for topic: ${topic}`);
      setComments(preloadedCommnets);
      setLoading(false);
    } else {
      init();
    }
  }, []);

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
      const newEndIx =
        newComments.nextIndex > 0 ? newComments.nextIndex - 1 : 0;
      const newStartIx =
        newEndIx - commentsToRead > 0 ? newEndIx - commentsToRead + 1 : 0;
      setCurrentStartIx(() => newStartIx);
      setCurrentEndIx(newEndIx);
      // return the newly read comments and the last index to the parent component
      if (onRead) {
        onRead(newComments.comments, newEndIx);
      }
      // TODO: remove currentStartIx log later, if scrolling is implemented
      console.log("currentStartIx: ", currentStartIx);
    }
  };

  // Will load comments for the given topic (which is the room-name)
  // TODO: auto-scroll to bottom when new comments are loaded
  const loadComments = async () => {
    try {
      setLoading(true);
      const newComments = await loadLatestComments(
        stamp,
        topic,
        signer,
        beeApiUrl,
        commentsToRead
      );

      updateCommentList(newComments);
    } catch (err) {
      console.log("loading comments error: ", err);
    } finally {
      setLoading(false);
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
      setComments((prevComments) => {
        prevComments.splice(foundIX, 1);
        prevComments.push({
          ...comment,
          error: false,
        });
        return prevComments;
      });
    }
  };

  // only add failed comments to the list, if not already present
  const onFailure = (comment: SwarmCommentWithErrorFlag) => {
    const foundIX = comments.findIndex(
      (c) => c.error && c.data === comment.data && c.id === comment.id
    );
    if (foundIX < 0) {
      setComments((prevComments) => [
        ...prevComments,
        {
          ...comment,
          error: true,
        },
      ]);
    }
  };

  const sendComment = async (comment: SwarmCommentWithErrorFlag) => {
    setSending(true);
    try {
      // trying to write to the next known index
      const expNextIx = currentEndIx === undefined ? 0 : currentEndIx + 1;
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
      // commentCheck.nexitIx is undefined if the read ix is defined
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
      console.log("Writing a new comment was successful: ", newComment);

      if (comment.error === true) {
        onResend(comment);
      } else {
        setComments((prevComments) => [...prevComments, comment]);
      }
      setCurrentEndIx(expNextIx);
      if (onComment) {
        onComment(newComment);
      }
    } catch (err) {
      console.log("writing comments error: ", err);
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
    const validEndIx = currentEndIx === undefined ? 0 : currentEndIx;
    try {
      const newComments = await loadNextComments(
        stamp,
        topic,
        signer,
        beeApiUrl,
        validEndIx,
        DEFAULT_NEW_COMMENTS_TO_READ
      );
      if (
        (newComments.nextIndex !== undefined &&
          newComments.nextIndex > validEndIx + 1) ||
        (currentEndIx === undefined && newComments.nextIndex > 0)
      ) {
        updateCommentList(newComments);
        console.log(
          `${newComments.comments.length} new commetns arrived, list is updated`
        );
      }
    } catch (err) {
      console.log("fetching new comments error: ", err);
    }
  }, [currentEndIx, loading, sending]);

  useEffect(() => {
    const interval = setInterval(async () => {
      updateNextCommentsCb();
    }, TEN_SECONDS);

    return () => clearInterval(interval);
  }, [updateNextCommentsCb]);

  return (
    <>
      <SwarmCommentList
        comments={comments}
        loading={loading}
        resend={sendComment}
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
