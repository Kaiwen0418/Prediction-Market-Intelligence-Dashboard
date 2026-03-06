import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

export function formatTimestamp(timestamp: string, pattern = "MMM d, HH:mm") {
  return format(parseISO(timestamp), pattern);
}

export function relativeTime(timestamp: string) {
  return formatDistanceToNowStrict(parseISO(timestamp), { addSuffix: true });
}
