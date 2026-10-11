import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FLYER_BUCKET,
  flyerContentType,
  flyerObjectPath,
  flyerObjectPathsToClear,
  isMissingImageUrlColumn,
  publicFlyerUrl,
  validateFlyerFile
} from './notificationFlyer';

describe('notificationFlyer', () => {
  it('accepts jpeg png webp gif and skips empty files', () => {
    assert.equal(validateFlyerFile(null), null);
    assert.equal(validateFlyerFile({ name: 'x.jpg', type: 'image/jpeg', size: 0 }), null);
    assert.equal(validateFlyerFile({ name: 'flyer.png', type: 'image/png', size: 1200 }), null);
    assert.equal(flyerContentType({ name: 'event.JPG', type: '', size: 10 }), 'image/jpeg');
    assert.equal(flyerObjectPath('abc', 'image/jpeg'), 'abc/flyer.jpg');
    assert.equal(publicFlyerUrl('https://example.supabase.co/', 'abc/flyer.jpg'),
      'https://example.supabase.co/storage/v1/object/public/notification-flyers/abc/flyer.jpg');
    assert.equal(FLYER_BUCKET, 'notification-flyers');
  });

  it('rejects oversized or unknown files', () => {
    assert.match(validateFlyerFile({ name: 'x.jpg', type: 'image/jpeg', size: 9 * 1024 * 1024 }) || '', /8 MB/);
    assert.match(validateFlyerFile({ name: 'notes.pdf', type: 'application/pdf', size: 100 }) || '', /JPEG/);
    assert.equal(flyerObjectPath('abc', 'application/pdf'), null);
  });

  it('clears previous flyer extensions and detects a missing column', () => {
    assert.deepEqual(flyerObjectPathsToClear('n1'), [
      'n1/flyer.jpg',
      'n1/flyer.png',
      'n1/flyer.webp',
      'n1/flyer.gif'
    ]);
    assert.equal(isMissingImageUrlColumn('column notifications.image_url does not exist'), true);
    assert.equal(isMissingImageUrlColumn('Could not find the image_url column in the schema cache'), true);
    assert.equal(isMissingImageUrlColumn('permission denied'), false);
  });
});
