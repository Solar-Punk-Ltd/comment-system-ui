import {
  Comment,
  CommentRequest,
  readComments,
  writeComment,
} from "@solarpunkltd/comment-system";
import SwarmCommentList from "./swarm-comment-list/swarm-comment-list";
import { useEffect, useState } from "react";
import SwarmCommentInput from "../swarm-comment-input/swarm-comment-input";
import { Bee, Signer, Topic } from "@ethersphere/bee-js";

/**
 * stamp - Postage stamp ID. If ommitted a first available stamp will be used.
 * topic - Comment topic that is used as the identifier
 * beeApiUrl - Bee API URL
 * signer - Signer object
 * username - Nickname of the user
 */
export interface SwarmCommentSystemProps {
  stamp: string;
  topic: string;
  beeApiUrl: string;
  signer: Signer;
  username: string;
}

export const SwarmCommentSystem: React.FC<SwarmCommentSystemProps> = ({
  stamp,
  topic,
  beeApiUrl,
  signer,
  username,
}) => {
  const bee = new Bee(beeApiUrl);
  const topicHex: Topic = bee.makeFeedTopic(topic);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  /** If the room already exists, it will load the comments,
   *  otherwise, it will create the room */
  async function init() {
    const isRetrievable = await loadComments();
    if (!isRetrievable) {
      await createFeed();
    }
  }

  useEffect(() => {
    init();
  }, []);

  // Will create a feed, with topic (room-name)
  async function createFeed() {
    try {
      console.info("Feed does not exist. Creating feed...");

      const feedReference = await bee.createFeedManifest(
        stamp,
        "sequence",
        topicHex,
        signer.address
      );

      console.info(`Created feed with reference ${feedReference.reference}`);
      setComments([]);
      setLoading(false);
    } catch (e) {
      console.error("feed gen error", e);
      setError(false);
    }
  }

  // Will load comments for the given topic (which is the room-name)
  const loadComments = async (): Promise<boolean> => {
    let isRetrievable = false;
    try {
      setLoading(true);

      const comments = await readComments({
        stamp,
        identifier: topicHex,
        signer,
        beeApiUrl,
        approvedFeedAddress: signer.address as unknown as string,
      });

      console.log("read comments: ", comments);
      setComments(comments);
      isRetrievable = true;
    } catch (error) {
      console.error(error);
      setError(error);
    } finally {
      setLoading(false);
    }

    return isRetrievable;
  };

  const sendComment = async (comment: CommentRequest) => {
    try {
      const newComment = await writeComment(comment, {
        stamp,
        identifier: topicHex,
        signer,
        beeApiUrl,
      });

      if (!newComment) throw "Comment write failed.";
      console.log("Write result ", newComment);

      setComments([...(comments as Comment[]), newComment]);
    } catch (error) {
      console.error("Error while sending comments: ", error);
      setError(error);
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
      <SwarmCommentInput username={username} onSubmit={sendComment} />
    </div>
  );
};
