import { FeedIndex, Topic, UploadResult } from "@ethersphere/bee-js";
import { MessageData, readCommentsInRange, readSingleComment } from "@solarpunkltd/comment-system";

import { safeConvertIndex } from "./helpers";

export const loadLatestComments = async (
  topic: string,
  address: string,
  beeApiUrl: string,
  numOfComments: bigint,
): Promise<MessageData[]> => {
  try {
    const topicHex = Topic.fromString(topic).toString();
    const latestComment = await readSingleComment(undefined, {
      identifier: topicHex,
      beeApiUrl,
      address,
    });

    const latestIx = safeConvertIndex(latestComment?.index);
    if (!latestComment || latestIx === undefined) {
      return [];
    }

    // if there is only one comment, return it
    if (latestIx === 1n) {
      return [latestComment];
    }

    const endIx = latestIx - 1n;
    const startIx = endIx > numOfComments ? endIx - numOfComments + 1n : 0n;
    const comments = await readCommentsInRange(FeedIndex.fromBigInt(startIx), FeedIndex.fromBigInt(endIx), {
      identifier: topicHex,
      beeApiUrl,
      address,
    });

    return [...(comments || []), latestComment];
  } catch (err) {
    console.error(`Loading the last ${numOfComments} comments of topic ${topic} error: ${err}`);
    return [];
  }
};

export const loadNextComments = async (
  topic: string,
  address: string,
  beeApiUrl: string,
  nextIx: bigint,
  numOfComments: bigint,
): Promise<MessageData[]> => {
  try {
    const topicHex = Topic.fromString(topic).toString();
    const latestComment = await readSingleComment(undefined, {
      identifier: topicHex,
      beeApiUrl,
      address,
    });

    const latestIx = safeConvertIndex(latestComment?.index);
    if (!latestComment || latestIx === undefined || latestIx <= nextIx) {
      return [];
    }

    if (latestIx - nextIx === 1n) {
      return [latestComment];
    }

    const startIx = nextIx === undefined ? 0n : nextIx;
    let endIx = startIx + numOfComments - 1n;
    // read until the end of the list or until numOfComments is read
    if (endIx >= latestIx) {
      endIx = latestIx - 1n;
    }

    const comments = await readCommentsInRange(FeedIndex.fromBigInt(startIx), FeedIndex.fromBigInt(endIx), {
      identifier: topicHex,
      beeApiUrl,
      address,
    });

    // the latest comment is already fetched
    return [...(comments || []), latestComment];
  } catch (err) {
    console.error(`Loading the next ${numOfComments} comments of topic ${topic} error: ${err}`);
    return [];
  }
};

export const verifyWriteSuccess = async (
  topicHex: string,
  address: string,
  beeApiUrl: string,
  index: FeedIndex,
  writeResult: UploadResult | undefined,
  data?: MessageData,
): Promise<MessageData> => {
  if (!writeResult) {
    throw new Error("Write failed, empty response!");
  }

  if (!data) {
    throw new Error("Comment write failed, empty response!");
  }

  const dataCheck = await readSingleComment(index, {
    identifier: topicHex,
    beeApiUrl,
    address,
  });

  if (!dataCheck) {
    throw new Error("Comment check failed, empty response!");
  }

  if (dataCheck.id !== data.id || dataCheck.timestamp !== data.timestamp) {
    throw new Error(`Write verification failed, expected "${data.message}", got: "${dataCheck.message}".
                Expected timestamp: ${data.timestamp}, got: ${dataCheck.timestamp}`);
  }

  return dataCheck;
};
