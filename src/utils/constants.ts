export const MAX_CHARACTER_COUNT = 4096;
const feedTypes = ["sequence", "epoch"] as const;
export type FeedType = (typeof feedTypes)[number];
export const DEFAULT_FEED_TYPE: FeedType = "sequence";
export const DEFAULT_NUM_OF_COMMENTS = 9;
export const DEFAULT_NEW_COMMENTS_TO_READ = 5;
export const TEN_SECONDS = (1000 * 60) / 6;
