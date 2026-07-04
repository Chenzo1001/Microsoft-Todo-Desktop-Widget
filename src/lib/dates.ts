export function taskDateKey(value?: string | null, timeZone?: string | null) {
  if (!value) return "";

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?/);
  if (!match) return "";

  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  const datePart = `${year}-${month}-${day}`;
  if (hour === "00" && minute === "00" && second === "00") return datePart;

  const date = new Date(normalizeDateTime(value, timeZone));
  return Number.isFinite(date.getTime()) ? localDateKey(date) : datePart;
}

export function formatTaskDate(value?: string | null, timeZone?: string | null) {
  const key = taskDateKey(value, timeZone);
  if (!key) return "";
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function compareTaskDueDates(left: TaskDateLike, right: TaskDateLike) {
  const leftKey = taskDateKey(left.dueDateTime, left.timeZone);
  const rightKey = taskDateKey(right.dueDateTime, right.timeZone);
  if (!leftKey && !rightKey) return 0;
  if (!leftKey) return 1;
  if (!rightKey) return -1;
  return leftKey.localeCompare(rightKey);
}

type TaskDateLike = {
  dueDateTime?: string | null;
  timeZone?: string | null;
};

function localDateKey(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function normalizeDateTime(value: string, _timeZone?: string | null) {
  let normalized = value.replace(/(\.\d{3})\d+/, "$1");
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(normalized)) return normalized;
  return `${normalized}Z`;
}
