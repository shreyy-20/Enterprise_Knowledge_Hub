import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatDate(dateStr: string, fmt: string = 'MMM d, yyyy'): string {
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr;
  }
}

export function formatRelativeDate(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trimEnd() + '…';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: '#f59e0b',
    published: '#10b981',
    archived: '#64748b',
    processing: '#3b82f6',
    active: '#10b981',
    completed: '#6366f1',
    healthy: '#10b981',
    degraded: '#f59e0b',
    unhealthy: '#ef4444',
  };
  return colors[status] || '#64748b';
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
}

export function getFileTypeFromName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext || 'unknown';
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function getScoreColor(score: number): string {
  if (score >= 0.8) return '#10b981';
  if (score >= 0.6) return '#3b82f6';
  if (score >= 0.4) return '#f59e0b';
  return '#ef4444';
}
