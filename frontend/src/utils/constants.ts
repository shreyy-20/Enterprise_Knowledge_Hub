export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const FILE_TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  pdf: { icon: 'PictureAsPdf', color: '#ef4444' },
  docx: { icon: 'Description', color: '#3b82f6' },
  doc: { icon: 'Description', color: '#3b82f6' },
  txt: { icon: 'TextSnippet', color: '#6366f1' },
  md: { icon: 'Code', color: '#10b981' },
  csv: { icon: 'TableChart', color: '#f59e0b' },
  xlsx: { icon: 'TableChart', color: '#10b981' },
  pptx: { icon: 'Slideshow', color: '#f97316' },
  json: { icon: 'DataObject', color: '#8b5cf6' },
  html: { icon: 'Html', color: '#ef4444' },
  default: { icon: 'InsertDriveFile', color: '#64748b' },
};

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  editor: 'Editor',
  viewer: 'Viewer',
  expert: 'Subject Expert',
};

export const DATE_FORMATS = {
  full: 'MMMM d, yyyy h:mm a',
  short: 'MMM d, yyyy',
  time: 'h:mm a',
  relative: 'relative',
  iso: "yyyy-MM-dd'T'HH:mm:ss",
};

export const STATUS_COLORS: Record<string, string> = {
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

export const SIDEBAR_WIDTH = 260;
export const SIDEBAR_COLLAPSED_WIDTH = 72;
export const HEADER_HEIGHT = 64;

export const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
];

export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.csv', '.json'];

export const SEARCH_TYPES = [
  { value: 'hybrid', label: 'Hybrid', description: 'Best of both worlds' },
  { value: 'semantic', label: 'Semantic', description: 'Meaning-based search' },
  { value: 'keyword', label: 'Keyword', description: 'Exact text matching' },
] as const;

export const TIME_RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
] as const;
