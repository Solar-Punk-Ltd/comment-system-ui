export const createUniqueUsername = (name: string, publicKey: string): string => {
  const cleanPubKey = publicKey.startsWith("0x") ? publicKey.slice(2) : publicKey;

  const keyIdentifier = cleanPubKey.slice(-6).toLowerCase();

  const part1 = keyIdentifier.slice(0, 3);
  const part2 = keyIdentifier.slice(3, 6);

  return `${name} ${part1}:${part2}`;
};

export const createMonogram = (name: string): string => {
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

// Helper function to safely parse index string that could be decimal or hex because of the legacy or decimal conversion sometimes the index is stored as decimal
export const safeConvertIndex = (indexStr?: string): bigint | undefined => {
  if (!indexStr) {
    return undefined;
  }

  const isHex = /[a-fA-F]/.test(indexStr) || indexStr.startsWith("0") || indexStr.length > 10;
  if (isHex) {
    return BigInt(parseInt(indexStr, 16));
  }

  return BigInt(parseInt(indexStr, 10));
};
