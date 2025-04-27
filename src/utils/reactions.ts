import { FeedIndex } from "@ethersphere/bee-js";
import { ReactionsWithIndex, readReactionsWithIndex } from "@solarpunkltd/comment-system";

import { isEmpty } from "./helpers";

export enum ReactionType {
  LIKE = "like",
  DISLIKE = "dislike",
}

export const readLatestReactions = async (
  index?: FeedIndex,
  identifier?: string,
  address?: string,
  beeApiUrl?: string,
): Promise<ReactionsWithIndex | undefined> => {
  try {
    const latestReactions = await readReactionsWithIndex(index, {
      identifier,
      address,
      beeApiUrl,
    });

    if (!isEmpty(latestReactions)) {
      return latestReactions as ReactionsWithIndex;
    }

    return;
  } catch (err) {
    console.error(`Error loading the latest reactions of identifier ${identifier}: ${err}`);
    return;
  }
};
