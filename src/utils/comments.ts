import { FeedIndex, Topic } from "@ethersphere/bee-js";
import { readCommentsInRange, readSingleComment } from "@solarpunkltd/comment-system";
import { CommentsWithIndex, SingleComment } from "./legacy.model";

import { isEmpty, transformToLegacyComment, transformToLegacySingleComment } from "./helpers";

export const readLatestComment = async (topic: string, address: string, beeApiUrl: string): Promise<SingleComment> => {
  try {
    const topicHex = Topic.fromString(topic).toString();
    const data = await readSingleComment(undefined, {
      identifier: topicHex,
      beeApiUrl: beeApiUrl,
      address,
    });
    return transformToLegacySingleComment(data);
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

    const topicHex = Topic.fromString(topic).toString();
    // the latest comment is already fetched
    const endIx = BigInt(latestComment.nextIndex) - 2n;
    const startIx = endIx > BigInt(numOfComments) ? endIx - BigInt(numOfComments) + 1n : 0n;
    const comments = await readCommentsInRange(FeedIndex.fromBigInt(startIx), FeedIndex.fromBigInt(endIx), {
      identifier: topicHex,
      beeApiUrl: beeApiUrl,
      address,
    });
    const legacyComments = comments ? comments.map(c => transformToLegacyComment(c)) : [];
    return {
      comments: [legacyComments, latestComment.comment],
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

    const startIx = nextIx === undefined ? 0n : BigInt(nextIx);
    const topicHex = Topic.fromString(topic).toString();
    let endIx = startIx + BigInt(numOfComments) - 1n;
    // read until the end of the list or until numOfComments is read
    if (endIx >= BigInt(latestComment.nextIndex)) {
      endIx = BigInt(latestComment.nextIndex) - 2n;
    }

    const comments = await readCommentsInRange(FeedIndex.fromBigInt(startIx), FeedIndex.fromBigInt(endIx), {
      identifier: topicHex,
      beeApiUrl: beeApiUrl,
      address,
    });
    // the latest comment is already fetched
    const legacyComments = comments ? comments.map(c => transformToLegacyComment(c)) : [];
    return {
      comments: [legacyComments, latestComment.comment],
      nextIndex: Number(endIx + 1n),
    } as CommentsWithIndex;
  } catch (err) {
    console.error(`Loading the next ${numOfComments} comments of topic ${topic} error: ${err}`);
    return {} as CommentsWithIndex;
  }
};
