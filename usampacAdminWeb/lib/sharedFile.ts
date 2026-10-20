export const SHARED_FILE_BUCKET = 'shared-files';
export const MAX_SHARED_FILE_BYTES = 8 * 1024 * 1024;

const TYPE_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

const EXT_BY_TYPE: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
};

const LABEL_BY_TYPE: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word'
};

export type SharedFileInput = {
  name: string;
  type: string;
  size: number;
};

export function sharedFileContentType(file: SharedFileInput): string | null {
  const declared = (file.type || '').trim().toLowerCase();
  if (EXT_BY_TYPE[declared]) return declared;
  const ext = (file.name.split('.').pop() || '').trim().toLowerCase();
  return TYPE_BY_EXT[ext] ?? null;
}

export function sharedFileKindLabel(contentType: string): string {
  return LABEL_BY_TYPE[contentType] ?? 'File';
}

export function safeSharedFileName(fileName: string): string {
  const base = (fileName.split(/[/\\]/).pop() || 'file').trim();
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^\.+/, '');
  return (cleaned || 'file').slice(0, 120);
}

export function sharedFileObjectPath(id: string, fileName: string): string {
  return `${id}/${safeSharedFileName(fileName)}`;
}

export function publicStorageFileUrl(supabaseUrl: string, storagePath: string): string {
  const base = supabaseUrl.replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${SHARED_FILE_BUCKET}/${storagePath.split('/').map(encodeURIComponent).join('/')}`;
}

export function publicSharedFilePageUrl(siteOrigin: string, id: string): string {
  const base = siteOrigin.replace(/\/$/, '');
  return `${base}/files/${id}`;
}

export function validateSharedFile(file: SharedFileInput | null | undefined): string | null {
  if (!file || file.size <= 0) return 'Choose a file.';
  if (file.size > MAX_SHARED_FILE_BYTES) return 'File must be 8 MB or smaller.';
  if (!sharedFileContentType(file)) return 'Use a PDF or Word file (.pdf, .doc, .docx).';
  return null;
}

export function validateSharedFileTitle(title: string | null | undefined): string | null {
  const value = (title ?? '').trim();
  if (!value) return 'Enter a name for this file.';
  if (value.length > 120) return 'Name must be 120 characters or fewer.';
  return null;
}
