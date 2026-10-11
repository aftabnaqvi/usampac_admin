export const FLYER_BUCKET = 'notification-flyers';
export const MAX_FLYER_BYTES = 8 * 1024 * 1024;

const TYPE_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif'
};

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

export type FlyerFile = {
  name: string;
  type: string;
  size: number;
};

export function flyerContentType(file: FlyerFile): string | null {
  const declared = (file.type || '').trim().toLowerCase();
  if (EXT_BY_TYPE[declared]) return declared;
  const ext = (file.name.split('.').pop() || '').trim().toLowerCase();
  return TYPE_BY_EXT[ext] ?? null;
}

export function flyerExtension(contentType: string): string | null {
  return EXT_BY_TYPE[contentType] ?? null;
}

export function flyerObjectPath(notificationId: string, contentType: string): string | null {
  const ext = flyerExtension(contentType);
  if (!ext) return null;
  return `${notificationId}/flyer.${ext}`;
}

export function flyerObjectPathsToClear(notificationId: string): string[] {
  return Object.values(EXT_BY_TYPE).map((ext) => `${notificationId}/flyer.${ext}`);
}

export function publicFlyerUrl(supabaseUrl: string, path: string): string {
  const base = supabaseUrl.replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${FLYER_BUCKET}/${path}`;
}

export function validateFlyerFile(file: FlyerFile | null | undefined): string | null {
  if (!file || file.size <= 0) return null;
  if (file.size > MAX_FLYER_BYTES) return 'Flyer must be 8 MB or smaller.';
  if (!flyerContentType(file)) return 'Use a JPEG, PNG, WebP, or GIF flyer.';
  return null;
}

export function isMissingImageUrlColumn(message: string | undefined): boolean {
  const text = (message || '').toLowerCase();
  return text.includes('image_url') && (text.includes('does not exist') || text.includes('schema cache'));
}
