import dayjs from "dayjs";

export function formatDate(date: Date | string | undefined, format?: string): string {
  if (!date) return "";
  return dayjs(date).format(format ?? "YYYY-MM-DD HH:mm:ss");
}

export function formatTime(date: Date | string | undefined, format?: string): string {
  return formatDate(date, format);
}
