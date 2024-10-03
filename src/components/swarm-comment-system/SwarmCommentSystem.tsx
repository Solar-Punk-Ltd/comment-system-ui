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
 * topic - Comment topic
 * beeApiUrl - Bee API URL
 * privateKey - Private key of the user
 * signer - Signer object
 * username - Nickname of the user
 */
export interface SwarmCommentSystemProps {
  stamp: string;
  topic: string;
  beeApiUrl: string;
  privateKey: string;
  signer: Signer;
  username: string;
}

export const SwarmCommentSystem: React.FC<SwarmCommentSystemProps> = (
  props
) => {
  const { stamp, topic, beeApiUrl, privateKey, signer, username } = props;
  const bee = new Bee(beeApiUrl);
  const topicHex: Topic = bee.makeFeedTopic(topic);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  /** If the room already exists, it will load the comments,
   *  otherwise, it will create the room */
  async function init() {
    const isRetrievable = await loadComments();
    if (!isRetrievable) {
      createFeed();
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
        privateKey,
      });

      console.log("read comments: ", comments);
      setComments(comments);
      isRetrievable = true;
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }

    return isRetrievable;
  };

  const sendComment = async (comment: CommentRequest) => {
    try {
      setFormLoading(true);

      const newComment = await writeComment(comment, {
        stamp,
        identifier: topicHex,
        signer,
        beeApiUrl,
        privateKey,
      });

      if (!newComment) throw "Comment write failed.";
      console.log("Write result ", newComment);

      setComments([...(comments as Comment[]), newComment]);
    } catch (error) {
      console.error("Error while sending comments: ", error);
      setError(error);
    } finally {
      setFormLoading(false);
    }
  };

  if (!comments) {
    return <div>Loading comments...</div>;
  }

  if (error) {
    return (
      <div className={"swarm-comment-system-wrapper"}>
        Error loading comments
      </div>
    );
  }

  return (
    <div className={"swarm-comment-system-wrapper"}>
      <SwarmCommentList comments={comments} />
      <SwarmCommentInput
        nickname={username}
        loading={loading || formLoading}
        onSubmit={sendComment}
      />
    </div>
  );
};
