import { Bee, Signer, Topic } from "@ethersphere/bee-js";
import {
  SingleComment,
  CommentsWithIndex,
  readCommentsAsync,
  readSingleComment,
} from "@solarpunkltd/comment-system";
import { isEmpty } from "./helpers";

export const readLatestComment = async (
  stamp: string,
  topic: string,
  signer: Signer,
  beeApiUrl: string
): Promise<SingleComment> => {
  const bee = new Bee(beeApiUrl);
  const topicHex: Topic = bee.makeFeedTopic(topic);
  let latestComment: SingleComment;
  try {
    latestComment = await readSingleComment({
      stamp: stamp,
      identifier: topicHex,
      signer: signer,
      beeApiUrl: beeApiUrl,
      approvedFeedAddress: signer.address as unknown as string,
    });
  } catch (err) {
    console.error(`Loading the latest comment of topic ${topic} error: ${err}`);
    return {} as SingleComment;
  }

  return latestComment;
};
// TODO: test updated logic
export const loadLatestComments = async (
  stamp: string,
  topic: string,
  signer: Signer,
  beeApiUrl: string,
  numOfComments: number
): Promise<CommentsWithIndex> => {
  let latestComments = {} as CommentsWithIndex;
  try {
    const latestComment = await readLatestComment(
      stamp,
      topic,
      signer,
      beeApiUrl
    );
    if (
      isEmpty(latestComment) ||
      latestComment.nextIndex === undefined ||
      latestComment.nextIndex === 0
    ) {
      return {} as CommentsWithIndex;
    }
    // if there is only one comment, return it
    if (latestComment.nextIndex === 1) {
      return {
        comments: [latestComment.comment],
        nextIndex: latestComment.nextIndex,
      } as CommentsWithIndex;
    }

    const bee = new Bee(beeApiUrl);
    const topicHex: Topic = bee.makeFeedTopic(topic);
    // the latest comment is already fetched
    const endIx = latestComment.nextIndex - 2;
    const startIx = endIx > numOfComments ? endIx - numOfComments + 1 : 0;
    const comments = await readCommentsAsync({
      stamp: stamp,
      identifier: topicHex,
      signer: signer,
      beeApiUrl: beeApiUrl,
      approvedFeedAddress: signer.address as unknown as string,
      startIx: startIx,
      endIx: endIx,
    });
    latestComments = {
      comments: [...comments, latestComment.comment],
      nextIndex: latestComment.nextIndex,
    };
  } catch (err) {
    console.error(
      `Loading the last ${numOfComments} comments of topic ${topic} error: ${err}`
    );
    return {} as CommentsWithIndex;
  }

  return latestComments;
};

export const loadNextComments = async (
  stamp: string,
  topic: string,
  signer: Signer,
  beeApiUrl: string,
  nextIx: number,
  numOfComments: number
): Promise<CommentsWithIndex> => {
  let nextComments = {} as CommentsWithIndex;
  try {
    const latestComment = await readLatestComment(
      stamp,
      topic,
      signer,
      beeApiUrl
    );
    if (
      isEmpty(latestComment) ||
      latestComment.nextIndex === undefined ||
      latestComment.nextIndex === 0 ||
      latestComment.nextIndex <= nextIx
    ) {
      return {} as CommentsWithIndex;
    }
    // if there is only one comment, return it
    if (latestComment.nextIndex === 1) {
      return {
        comments: [latestComment.comment],
        nextIndex: latestComment.nextIndex,
      } as CommentsWithIndex;
    }

    const startIx = nextIx === undefined ? 0 : nextIx;
    const bee = new Bee(beeApiUrl);
    const topicHex: Topic = bee.makeFeedTopic(topic);
    let endIx = startIx + numOfComments - 1;
    // read until the end of the list or until numOfComments is read
    if (endIx >= latestComment.nextIndex) {
      endIx = latestComment.nextIndex - 2;
    }

    const comments = await readCommentsAsync({
      stamp: stamp,
      identifier: topicHex,
      signer: signer,
      beeApiUrl: beeApiUrl,
      approvedFeedAddress: signer.address as unknown as string,
      startIx: startIx,
      endIx: endIx,
    });
    // the latest comment is already fetched
    nextComments = {
      comments: [...comments, latestComment.comment],
      nextIndex: endIx + 1,
    };
  } catch (err) {
    `Loading the next ${numOfComments} comments of topic ${topic} error: ${err}`;
    return {} as CommentsWithIndex;
  }

  return nextComments;
};
