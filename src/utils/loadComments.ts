import { Bee, Signer, Topic } from "@ethersphere/bee-js";
import {
  Comment,
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
    console.log(`loaded latest comment of topic ${topic} success`);
  } catch (err) {
    console.log("loading latest comment error: ", err);
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
  let comments = {} as Comment[];
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
    const endIx = latestComment.nextIndex ? latestComment.nextIndex - 1 : 0;
    const startIx = endIx > numOfComments ? endIx - numOfComments + 1 : 0;
    comments = await readCommentsAsync({
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
      nextIndex: endIx + 1,
    };
    console.log(
      `loading latest ${numOfComments} comments of topic ${topic} success`
    );
  } catch (err) {
    console.log(`load last ${numOfComments} comments error: ${err}`);
    return {} as CommentsWithIndex;
  }

  return latestComments;
};
