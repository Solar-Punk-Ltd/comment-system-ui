import { useEffect, useState } from "react";
import { Bee, Signer, Topic } from "@ethersphere/bee-js";
import {
  Comment,
  CommentRequest,
  writeComment,
} from "@solarpunkltd/comment-system";
import "./swarm-comment-system.scss";
import SwarmCommentList from "./swarm-comment-list/swarm-comment-list";
import SwarmCommentInput from "../swarm-comment-input/swarm-comment-input";
import { loadLatestComments } from "../../utils/loadComments";
import { isEmpty } from "../../utils/helpers";

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
  onRead?: (comments: Comment[], end: number) => void;
}

const defaultNumOfComments = 9;

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
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [currentStartIx, setCurrentStartIx] = useState<number>(startIx || 0);
  const [currentEndIx, setCurrentEndIx] = useState<number>(endIx || 0);

  const commentsToRead = numOfComments || defaultNumOfComments;

  /** If the room already exists, it will load the comments,
   *  otherwise, it will create the room */
  async function init() {
    await loadComments();
  }

  useEffect(() => {
    if (preloadedCommnets) {
      console.log(`pre-loading comments for topic: ${topic}`);
      setComments(preloadedCommnets);
    } else {
      init();
    }
  }, []);

  // Will load comments for the given topic (which is the room-name)
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

      if (!isEmpty(newComments)) {
        const tmpComments: Comment[] = [...comments].concat(
          newComments.comments
        );
        console.log("loading comments success: ", tmpComments);
        setComments(tmpComments);
        setError(false);
        const newStartIx =
          newComments.nextIndex - defaultNumOfComments > 0
            ? newComments.nextIndex - defaultNumOfComments
            : 0;
        setCurrentStartIx(newStartIx);
        const newEndIx = newComments.nextIndex - 1;
        setCurrentEndIx(newEndIx);
        // return the start and end index to the parent component
        if (onRead) {
          onRead(tmpComments, newEndIx);
        }
        console.log("currentStartIx: ", currentStartIx);
        console.log("currentEndIx: ", currentEndIx);
      }
    } catch (err) {
      console.log("loading comments error: ", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const sendComment = async (comment: CommentRequest) => {
    try {
      const newComment = await writeComment(comment, {
        stamp,
        identifier: topicHex,
        signer,
        beeApiUrl,
      });

      if (!newComment) {
        throw "Comment write failed.";
      }
      console.log("Write result ", newComment);

      setComments([...(comments as Comment[]), newComment]);
      setCurrentEndIx(currentEndIx + 1);
      if (onComment) {
        onComment(newComment);
      }
      setError(false);
    } catch (err) {
      console.log("sendComment error: ", err);
      setError(true);
    }
  };

  if (error) {
    return (
      <div className={"swarm-comment-system-wrapper"}>
        Error loading comments
      </div>
    );
  }

  return (
    <div className={"swarm-comment-system-wrapper"}>
      <SwarmCommentList comments={comments} loading={loading} />
      {!loading && (
        <SwarmCommentInput
          username={username}
          maxCharacterCount={maxCharacterCount}
          onSubmit={sendComment}
        />
      )}
    </div>
  );
};
