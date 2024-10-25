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
    console.log(`loading the latest comment of topic ${topic} error: ${err}`);
    return {} as SingleComment;
  }

  return latestComment;
};

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
    if (isEmpty(latestComment)) {
      return {} as CommentsWithIndex;
    }

    const bee = new Bee(beeApiUrl);
    const topicHex: Topic = bee.makeFeedTopic(topic);
    const nextIndex =
      latestComment.nextIndex === undefined ? 0 : latestComment.nextIndex;
    const endIx = nextIndex === 0 ? 0 : nextIndex - 1;
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
      comments: comments,
      nextIndex: nextIndex,
    };
    console.log(
      `loading the latest ${numOfComments} comments of topic ${topic} success`
    );
  } catch (err) {
    console.log(
      `loading the last ${numOfComments} comments of topic ${topic} error: ${err}`
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
  prevEndIx: number,
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
    if (isEmpty(latestComment)) {
      return {} as CommentsWithIndex;
    }

    const nextIndex =
      latestComment.nextIndex === undefined ? 0 : latestComment.nextIndex;
    if (prevEndIx === 0) {
      if (nextIndex === 0) {
        return {} as CommentsWithIndex;
      }
    } else if (nextIndex - 1 <= prevEndIx) {
      return {} as CommentsWithIndex;
    }

    const bee = new Bee(beeApiUrl);
    const topicHex: Topic = bee.makeFeedTopic(topic);
    let endIx;
    if (prevEndIx + numOfComments < nextIndex) {
      endIx = prevEndIx + numOfComments - 1;
    } else {
      endIx = nextIndex - 1 > 0 ? nextIndex - 1 : 0;
    }

    const comments = await readCommentsAsync({
      stamp: stamp,
      identifier: topicHex,
      signer: signer,
      beeApiUrl: beeApiUrl,
      approvedFeedAddress: signer.address as unknown as string,
      startIx: prevEndIx + 1,
      endIx: endIx,
    });
    nextComments = {
      comments: comments,
      nextIndex: endIx + 1,
    };
    console.log(
      `loading the next ${numOfComments} comments of topic ${topic} success`
    );
  } catch (err) {
    `loading the next ${numOfComments} comments of topic ${topic} error: ${err}`;
    return {} as CommentsWithIndex;
  }

  return nextComments;
};
