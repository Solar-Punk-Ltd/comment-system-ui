import { useEffect, useState, useRef, useCallback } from "react";
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
import SwarmCommentPopup from "../swarm-comment-popup/swarm-comment-popup";
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
  const [currentStartIx, setCurrentStartIx] = useState<number>(startIx || 0);
  const [currentEndIx, setCurrentEndIx] = useState<number>(endIx || 0);
  const [showResendPopUp, setShowResendPopUp] = useState<boolean>(false);
  const resendRef = useRef<HTMLButtonElement>(null);

  const commentsToRead = numOfComments || DEFAULT_NUM_OF_COMMENTS;

  /** If the room already exists, it will load the comments,
   *  otherwise, it will create the room */
  async function init() {
    await loadComments();
  }

  useEffect(() => {
    if (preloadedCommnets) {
      console.log(`pre-loading comments for topic: ${topic}`);
      setComments(preloadedCommnets);
      setLoading(false);
    } else {
      init();
    }
  }, []);

  const updateCommentList = (newComments: CommentsWithIndex) => {
    if (!isEmpty(newComments)) {
      setComments([...comments].concat(newComments.comments));
      console.log(
        "updated comment list with new comments: ",
        newComments.comments
      );
      const newEndIx = newComments.nextIndex - 1;
      const newStartIx =
        newEndIx - commentsToRead > 0 ? newEndIx - commentsToRead + 1 : 0;
      setCurrentStartIx(() => newStartIx);
      setCurrentEndIx(() => newEndIx);
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

  const sendComment = async (comment: CommentRequest) => {
    try {
      // trying to write to the next known index
      const expNextIx = currentEndIx + 1;
      console.log("writing comment to index: ", expNextIx);
      const newComment = await writeCommentToIndex(comment, {
        stamp,
        identifier: topicHex,
        signer,
        beeApiUrl,
        startIx: expNextIx,
      });

      if (!newComment || Array.from(Object.keys(newComment)).length === 0) {
        setComments((prevComments) => [
          ...prevComments,
          {
            ...comment,
            error: true,
          },
        ]);
        throw "Comment write failed, empty response!";
      }
      console.log("Write result ", newComment);
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
        setComments((prevComments) => [
          ...prevComments,
          {
            ...comment,
            error: true,
          },
        ]);
        // if another comment is found at the expected index then updateNextCommentsCb shall find it and update the list
        throw `comment check failed, expected "${comment.data}", got: "${commentCheck.comment.data}".
                Expected timestamp: ${comment.timestamp}, got: ${commentCheck.comment.timestamp}`;
      }
      // if resend is succesful then find, remove and push the currently error-flagged comment to the end of the list
      const foundIX = comments.findIndex(
        (c) => c.error && c.data === comment.data
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
      } else {
        setComments((prevComments) => [...prevComments, newComment]);
      }
      setCurrentEndIx((prevEndIx) => prevEndIx + 1);
      if (onComment) {
        onComment(newComment);
      }
      setShowResendPopUp(false);
    } catch (err) {
      console.log("writing comments error: ", err);
      setShowResendPopUp(true);
      throw err;
    }
  };

  const handleResendButton = () => {
    setShowResendPopUp(false);
    if (resendRef.current) {
      resendRef.current.click();
    }
  };

  const handlCancel = () => {
    setShowResendPopUp(false);
  };

  // loading new comments in every 10 seconds
  const updateNextCommentsCb = useCallback(async () => {
    try {
      const newComments = await loadNextComments(
        stamp,
        topic,
        signer,
        beeApiUrl,
        currentEndIx,
        DEFAULT_NEW_COMMENTS_TO_READ
      );
      if (newComments.nextIndex > currentEndIx + 1) {
        updateCommentList(newComments);
        console.log(
          `${newComments.comments.length} new commetns arrived, list is updated`
        );
      }
    } catch (err) {
      console.log("fetching new comments error: ", err);
    }
  }, [currentEndIx]);
  // TODO: sometimes loading the next one owerwrites the previous ones
  useEffect(() => {
    if (loading) {
      return;
    }
    const interval = setInterval(async () => {
      updateNextCommentsCb();
    }, TEN_SECONDS);

    return () => clearInterval(interval);
  }, [loading, updateNextCommentsCb]);

  return (
    <div className={"swarm-comment-system-wrapper"}>
      {showResendPopUp && (
        <SwarmCommentPopup
          question="Failed to send comment!"
          leftButtonText="Cancel"
          leftButtonHandler={() => handlCancel()}
          rightButtonText="Try again"
          rightButtonHandler={() => handleResendButton()}
        />
      )}
      <SwarmCommentList comments={comments} loading={loading} />
      {!loading && (
        <>
          <SwarmCommentInput
            username={username}
            maxCharacterCount={maxCharacterCount}
            onSubmit={sendComment}
            onResend={setShowResendPopUp}
            buttonRef={resendRef}
          />
        </>
      )}
    </div>
  );
};
