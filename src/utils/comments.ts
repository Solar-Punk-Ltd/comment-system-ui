import { CommentsWithIndex, readCommentsInRange, readSingleComment, SingleComment } from "@solarpunkltd/comment-system";

import { DEFAULT_NUM_OF_COMMENTS } from "./constants";
import { isEmpty } from "./helpers";

export const readLatestComment = async (
  identifier?: string,
  address?: string,
  beeApiUrl?: string,
): Promise<SingleComment> => {
  try {
    return await readSingleComment(undefined, {
      identifier: identifier,
      beeApiUrl: beeApiUrl,
      approvedFeedAddress: address,
    });
  } catch (err) {
    console.error(`Loading the latest comment of identifier ${identifier} error: ${err}`);
    return {} as SingleComment;
  }
};

export const loadLatestComments = async (
  identifier?: string,
  address?: string,
  beeApiUrl?: string,
  numOfComments?: number,
): Promise<CommentsWithIndex> => {
  const commentsToRead = numOfComments || DEFAULT_NUM_OF_COMMENTS;
  try {
    const latestComment = await readLatestComment(identifier, address, beeApiUrl);
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

    // the latest comment is already fetched
    const endIx = latestComment.nextIndex - 2;
    const startIx = endIx > commentsToRead ? endIx - commentsToRead + 1 : 0;
    const comments = await readCommentsInRange(startIx, endIx, {
      identifier: identifier,
      beeApiUrl: beeApiUrl,
      approvedFeedAddress: address,
    });
    return {
      comments: [...comments, latestComment.comment],
      nextIndex: latestComment.nextIndex,
    } as CommentsWithIndex;
  } catch (err) {
    console.error(`Loading the last ${commentsToRead} comments of identifier ${identifier} error: ${err}`);
    return {} as CommentsWithIndex;
  }
};

export const loadNextComments = async (
  nextIx: number,
  identifier?: string,
  address?: string,
  beeApiUrl?: string,
  numOfComments?: number,
): Promise<CommentsWithIndex> => {
  const commentsToRead = numOfComments || DEFAULT_NUM_OF_COMMENTS;
  try {
    const latestComment = await readLatestComment(identifier, address, beeApiUrl);
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
    let endIx = startIx + commentsToRead - 1;
    // read until the end of the list or until commentsToRead is read
    if (endIx >= latestComment.nextIndex) {
      endIx = latestComment.nextIndex - 2;
    }

    const comments = await readCommentsInRange(startIx, endIx, {
      identifier: identifier,
      beeApiUrl: beeApiUrl,
      approvedFeedAddress: address,
    });
    // the latest comment is already fetched
    return {
      comments: [...comments, latestComment.comment],
      nextIndex: endIx + 1,
    } as CommentsWithIndex;
  } catch (err) {
    `Loading the next ${commentsToRead} comments of identifier ${identifier} error: ${err}`;
    return {} as CommentsWithIndex;
  }
};
