import { useEffect, useState } from "react";
import { Bee, Signer, Topic } from "@ethersphere/bee-js";
import {
  Comment,
  CommentRequest,
  LatestComment,
  LastNComments,
  readCommentsAsync,
  readLatestComment,
  writeComment,
} from "@solarpunkltd/comment-system";
import "./swarm-comment-system.scss";
import SwarmCommentList from "./swarm-comment-list/swarm-comment-list";
import SwarmCommentInput from "../swarm-comment-input/swarm-comment-input";
import { isEmpty } from "../../utils/helpers";

/**
 * stamp - Postage stamp ID. If ommitted a first available stamp will be used.
 * topic - Comment topic that is used as the identifier
 * beeApiUrl - Bee API URL
 * signer - Signer object
 * username - Nickname of the user
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
  startIx?: number;
  endIx?: number;
  onComment?: (newComment: Comment, end: number) => void;
  onRead?: (start: number) => void;
}

// TODO: make max as prop
const defaultNumOfComments = 9;

export const SwarmCommentSystem: React.FC<SwarmCommentSystemProps> = ({
  stamp,
  topic,
  beeApiUrl,
  signer,
  username,
  startIx,
  endIx,
  preloadedCommnets,
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
      const newComments = await loadLastNComments(
        stamp,
        topic,
        signer,
        beeApiUrl,
        defaultNumOfComments
      );

      if (!isEmpty(newComments)) {
        const tmpComments: Comment[] = [...comments].concat(
          newComments.comments
        );
        console.log("loading comments success: ", tmpComments);
        setComments(tmpComments);
        // TOOD: review if indexes are needed, if yes, than start can be end - maxnum
        const newStartIx =
          newComments.nextIndex - defaultNumOfComments > 0
            ? newComments.nextIndex - defaultNumOfComments
            : 0;
        setCurrentStartIx(newStartIx);
        setCurrentEndIx(newComments.nextIndex);
        setError(false);
        if (onRead) {
          onRead(newStartIx);
        }
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
      const newEndIx = currentEndIx + 1;
      setCurrentEndIx(newEndIx);
      if (onComment) {
        onComment(newComment, newEndIx);
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
        <SwarmCommentInput username={username} onSubmit={sendComment} />
      )}
    </div>
  );
};

export const loadLatestComment = async (
  stamp: string,
  topic: string,
  signer: Signer,
  beeApiUrl: string
): Promise<LatestComment> => {
  const bee = new Bee(beeApiUrl);
  const topicHex: Topic = bee.makeFeedTopic(topic);
  let latestComment: LatestComment;
  try {
    latestComment = await readLatestComment({
      stamp: stamp,
      identifier: topicHex,
      signer: signer,
      beeApiUrl: beeApiUrl,
      approvedFeedAddress: signer.address as unknown as string,
    });

    console.log(
      `loaded latest comment for topic ${topic} success: ${latestComment}`
    );
  } catch (err) {
    console.log("loading latest comment error: ", err);
    return {} as LatestComment;
  }

  return latestComment;
};

export const loadLastNComments = async (
  stamp: string,
  topic: string,
  signer: Signer,
  beeApiUrl: string,
  numOfComments: number
): Promise<LastNComments> => {
  let lastNComments = {} as LastNComments;
  let comments = {} as Comment[];
  try {
    const latestComment = await loadLatestComment(
      stamp,
      topic,
      signer,
      beeApiUrl
    );
    if (isEmpty(latestComment)) {
      return {} as LastNComments;
    }

    const bee = new Bee(beeApiUrl);
    const topicHex: Topic = bee.makeFeedTopic(topic);
    const nextIndex = latestComment.nextIndex - 1;
    const startIx = nextIndex > numOfComments ? nextIndex - numOfComments : 0;
    comments = await readCommentsAsync({
      stamp: stamp,
      identifier: topicHex,
      signer: signer,
      beeApiUrl: beeApiUrl,
      approvedFeedAddress: signer.address as unknown as string,
      startIx: startIx,
      endIx: nextIndex,
    });
    lastNComments = {
      comments: comments,
      nextIndex: latestComment.nextIndex,
    };
    console.log(
      `loading last ${numOfComments} comments for topic ${topic} success: `,
      latestComment
    );
  } catch (err) {
    console.log(`load last ${numOfComments} comments error: ${err}`);
    return {} as LastNComments;
  }

  return lastNComments;
};
