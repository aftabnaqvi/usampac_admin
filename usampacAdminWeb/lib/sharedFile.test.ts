import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_SHARED_FILE_BYTES,
  SHARED_FILE_BUCKET,
  publicSharedFilePageUrl,
  publicStorageFileUrl,
  safeSharedFileName,
  sharedFileContentType,
  sharedFileKindLabel,
  sharedFileObjectPath,
  validateSharedFile,
  validateSharedFileTitle
} from './sharedFile';

describe('sharedFile', () => {
  it('accepts pdf and word files and labels them', () => {
    assert.equal(validateSharedFile({ name: 'notice.pdf', type: 'application/pdf', size: 100 }), null);
    assert.equal(validateSharedFile({ name: 'notes.DOC', type: '', size: 100 }), null);
    assert.equal(
      sharedFileContentType({ name: 'minutes.docx', type: 'application/octet-stream', size: 10 }),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    assert.equal(sharedFileKindLabel('application/pdf'), 'PDF');
    assert.equal(sharedFileKindLabel('application/msword'), 'Word');
    assert.equal(SHARED_FILE_BUCKET, 'shared-files');
  });

  it('rejects empty, oversized, and other types', () => {
    assert.match(validateSharedFile(null) || '', /Choose a file/);
    assert.match(validateSharedFile({ name: 'a.pdf', type: 'application/pdf', size: 0 }) || '', /Choose a file/);
    assert.match(
      validateSharedFile({ name: 'a.pdf', type: 'application/pdf', size: MAX_SHARED_FILE_BYTES + 1 }) || '',
      /8 MB/
    );
    assert.match(validateSharedFile({ name: 'photo.png', type: 'image/png', size: 100 }) || '', /PDF or Word/);
  });

  it('requires a short display name and builds a public page url', () => {
    assert.match(validateSharedFileTitle('  ') || '', /name/);
    assert.equal(validateSharedFileTitle('October meeting'), null);
    assert.match(validateSharedFileTitle('x'.repeat(121)) || '', /120/);
    assert.equal(safeSharedFileName('../My Notice (final).pdf'), 'My-Notice-final-.pdf');
    assert.equal(sharedFileObjectPath('abc', 'My Notice.pdf'), 'abc/My-Notice.pdf');
    assert.equal(
      publicSharedFilePageUrl('https://usampac-admin-sigma.vercel.app/', 'abc'),
      'https://usampac-admin-sigma.vercel.app/files/abc'
    );
    assert.equal(
      publicStorageFileUrl('https://example.supabase.co', 'abc/My Notice.pdf'),
      'https://example.supabase.co/storage/v1/object/public/shared-files/abc/My%20Notice.pdf'
    );
  });
});
