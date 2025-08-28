import { isLegacyUserComment, isUserComment, MessageData, MessageType } from "@solarpunkltd/comment-system";
import { SingleComment, UserComment } from "./legacy.model";
import { FeedIndex } from "@ethersphere/bee-js";

export const createMonogram = (name: string) => {
  const initials = name.split(" ").map(n => n[0]);
  return initials.join("").toUpperCase();
};

export function formatTime(timestamp?: number) {
  if (!timestamp) {
    return "";
  }
  const date = new Date(timestamp);
  const now = new Date();

  const formatHM = (date: Date) =>
    date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const formatDate = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (isSameDay(date, now)) {
    return formatHM(date);
  }

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, yesterday)) {
    return `Yesterday ${formatHM(date)}`;
  }

  if (date.getFullYear() === now.getFullYear()) {
    return `${formatDate(date)} ${formatHM(date)}`;
  }

  return `${date.getFullYear()} ${formatDate(date)} ${formatHM(date)}`;
}

export function isSameDay(firstDate: Date, secondDate: Date) {
  return (
    firstDate.getDate() === secondDate.getDate() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getFullYear() === secondDate.getFullYear()
  );
}

export function isEmpty(obj?: object) {
  if (!obj) {
    return true;
  }
  return Object.keys(obj).length === 0;
}

export function transformLegacyComment(
  obj: UserComment,
  derivedAddress: string,
  index: string,
  topic: string,
): MessageData {
  const { username, message, timestamp, address } = obj;
  const { text, messageId, threadId, flagged, reason } = message;

  const transformed: MessageData = {
    id: messageId || "",
    username,
    timestamp,
    type: MessageType.TEXT,
    message: text,
    address: address || derivedAddress,
    index,
    topic,
    targetMessageId: threadId,
    signature: undefined,
    flagged,
    reason,
    isLegacy: true,
  };

  return transformed;
}

export function assertAndTransformData(
  data: unknown,
  address: string,
  index: FeedIndex,
  identifier: string,
): MessageData {
  if (isUserComment(data)) {
    return data;
  }
  if (isLegacyUserComment(data)) {
    return transformLegacyComment(data, address, index.toString(), identifier);
  }

  throw new TypeError(`Invalid comment format: ${JSON.stringify(data)}`);
}

export const transformToLegacyComment = (data: MessageData): UserComment => {
  return {
    message: {
      text: data?.message || "",
      messageId: data?.id || "",
      threadId: data?.id || "",
      parent: "",
      flagged: data?.flagged || false,
    },
    timestamp: data?.timestamp,
    username: data?.username || "",
    address: data?.address || "",
  };
};

export const transformToLegacySingleComment = (data?: MessageData): SingleComment => {
  if (!data) return {} as SingleComment;

  return {
    comment: transformToLegacyComment(data),
    nextIndex: data?.index ? Number(new FeedIndex(data.index).toBigInt()) : undefined,
  };
};
