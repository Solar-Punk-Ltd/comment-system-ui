import { Bee, Topic } from "@ethersphere/bee-js";
import { CommentsWithIndex, readCommentsInRange, readSingleComment, SingleComment } from "@solarpunkltd/comment-system";

import { isEmpty } from "./helpers";

export const readLatestComment = async (topic: string, address: string, beeApiUrl: string): Promise<SingleComment> => {
  try {
    const bee = new Bee(beeApiUrl);
    const topicHex: Topic = bee.makeFeedTopic(topic);
    return await readSingleComment(undefined, {
      identifier: topicHex,
      beeApiUrl: beeApiUrl,
      approvedFeedAddress: address,
    });
  } catch (err) {
    console.error(`Loading the latest comment of topic ${topic} error: ${err}`);
    return {} as SingleComment;
  }
};

export const loadLatestComments = async (
  topic: string,
  address: string,
  beeApiUrl: string,
  numOfComments: number,
): Promise<CommentsWithIndex> => {
  try {
    const latestComment = await readLatestComment(topic, address, beeApiUrl);
    if (isEmpty(latestComment) || latestComment.nextIndex === undefined || latestComment.nextIndex === 0) {
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
    const comments = await readCommentsInRange(startIx, endIx, {
      identifier: topicHex,
      beeApiUrl: beeApiUrl,
      approvedFeedAddress: address,
    });
    return {
      comments: [...comments, latestComment.comment],
      nextIndex: latestComment.nextIndex,
    } as CommentsWithIndex;
  } catch (err) {
    console.error(`Loading the last ${numOfComments} comments of topic ${topic} error: ${err}`);
    return {} as CommentsWithIndex;
  }
};

export const loadNextComments = async (
  topic: string,
  address: string,
  beeApiUrl: string,
  nextIx: number,
  numOfComments: number,
): Promise<CommentsWithIndex> => {
  try {
    const latestComment = await readLatestComment(topic, address, beeApiUrl);
    if (
      isEmpty(latestComment) ||
      latestComment.nextIndex === undefined ||
      latestComment.nextIndex === 0 ||
      latestComment.nextIndex <= nextIx
    ) {
      return {} as CommentsWithIndex;
    }
    // if there is only one comment, return it
    if (latestComment.nextIndex - nextIx === 1) {
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

    const comments = await readCommentsInRange(startIx, endIx, {
      identifier: topicHex,
      beeApiUrl: beeApiUrl,
      approvedFeedAddress: address,
    });
    // the latest comment is already fetched
    return {
      comments: [...comments, latestComment.comment],
      nextIndex: endIx + 1,
    } as CommentsWithIndex;
  } catch (err) {
    `Loading the next ${numOfComments} comments of topic ${topic} error: ${err}`;
    return {} as CommentsWithIndex;
  }
};
