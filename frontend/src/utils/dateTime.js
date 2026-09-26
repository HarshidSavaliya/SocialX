function parseDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatRelativeTime(value, now = Date.now()) {
  const date = parseDate(value);
  if (!date) return 'Unknown time';

  const differenceSeconds = Math.round((date.getTime() - now) / 1000);
  const absoluteSeconds = Math.abs(differenceSeconds);
  const future = differenceSeconds > 0;

  if (absoluteSeconds < 10) return future ? 'in a moment' : 'just now';

  const units = [
    ['y', 365 * 24 * 60 * 60],
    ['mo', 30 * 24 * 60 * 60],
    ['d', 24 * 60 * 60],
    ['h', 60 * 60],
    ['m', 60],
    ['s', 1]
  ];
  const [unit, secondsPerUnit] = units.find(([, seconds]) => absoluteSeconds >= seconds);
  const amount = Math.floor(absoluteSeconds / secondsPerUnit);

  return future ? `in ${amount}${unit}` : `${amount}${unit} ago`;
}

export function formatConversationTime(value, now = new Date()) {
  const date = parseDate(value);
  if (!date) return '';

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function formatMessageTime(value) {
  const date = parseDate(value);
  if (!date) return '';

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
