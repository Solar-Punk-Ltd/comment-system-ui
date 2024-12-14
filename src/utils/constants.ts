export const MAX_CHARACTER_COUNT = 4096;
const feedTypes = ["sequence", "epoch"] as const;
export type FeedType = (typeof feedTypes)[number];
export const DEFAULT_FEED_TYPE: FeedType = "sequence";
export const DEFAULT_NUM_OF_COMMENTS = 9;
export const THREE_SECONDS = 1000 * 3;
export const ETH_ADDRESS_LENGTH = 40;
