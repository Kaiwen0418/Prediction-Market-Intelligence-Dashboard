import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";

function coerceDate(input: string | number | Date): Date | null {
  if (input instanceof Date) {
    return isValid(input) ? input : null;
  }

  if (typeof input === "number") {
    const epochDate = new Date(input);
    return isValid(epochDate) ? epochDate : null;
  }

  if (typeof input !== "string" || input.trim().length === 0) {
    return null;
  }

  const isoDate = parseISO(input);
  if (isValid(isoDate)) {
    return isoDate;
  }

  const nativeDate = new Date(input);
  return isValid(nativeDate) ? nativeDate : null;
}

export function formatTimestamp(timestamp: string | number | Date, pattern = "MMM d, HH:mm") {
  const date = coerceDate(timestamp);
  if (!date) return "Unknown time";
  return format(date, pattern);
}

export function relativeTime(timestamp: string | number | Date) {
  const date = coerceDate(timestamp);
  if (!date) return "unknown time";
  return formatDistanceToNowStrict(date, { addSuffix: true });
}
