import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import AdminHeader from '@/app/components/AdminHeader';
import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabaseEnv } from '@/lib/supabaseEnv';
import {
  SHARED_FILE_BUCKET,
  publicSharedFilePageUrl,
  publicStorageFileUrl,
  sharedFileContentType,
  sharedFileKindLabel,
  sharedFileObjectPath,
  validateSharedFile,
  validateSharedFileTitle
} from '@/lib/sharedFile';

type SharedFileRow = {
  id: string;
  title: string;
  file_name: string;
  content_type: string;
  storage_path: string;
  created_at: string;
};

const SETUP_MESSAGE = 'Run sql/shared_files.sql in the Supabase SQL Editor, then upload again.';

function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  const headerList = headers();
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || 'usampac-admin-sigma.vercel.app';
  const proto = headerList.get('x-forwarded-proto') || 'https';
  return `${proto}://${host}`;
}

function isMissingSharedFiles(message: string) {
  const text = message.toLowerCase();
  return text.includes('shared_files') && (text.includes('does not exist') || text.includes('schema cache'));
}

async function listSharedFiles(): Promise<SharedFileRow[]> {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from('shared_files')
    .select('id,title,file_name,content_type,storage_path,created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SharedFileRow[];
}

async function ensureBucket() {
  const admin = supabaseAdmin();
  const { data } = await admin.storage.getBucket(SHARED_FILE_BUCKET);
  if (data) return;
  const { error } = await admin.storage.createBucket(SHARED_FILE_BUCKET, {
    public: true,
    fileSizeLimit: '8MB',
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  });
  if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
}

async function uploadSharedFile(formData: FormData) {
  'use server';
  await requireAdmin('/documents');
  const title = String(formData.get('title') ?? '');
  const titleError = validateSharedFileTitle(title);
  if (titleError) throw new Error(titleError);

  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('Choose a file.');
  const invalid = validateSharedFile({ name: file.name, type: file.type, size: file.size });
  if (invalid) throw new Error(invalid);
  const contentType = sharedFileContentType({ name: file.name, type: file.type, size: file.size });
  if (!contentType) throw new Error('Use a PDF or Word file (.pdf, .doc, .docx).');

  const admin = supabaseAdmin();
  const id = randomUUID();
  const storagePath = sharedFileObjectPath(id, file.name);
  await ensureBucket();
  const bytes = Buffer.from(await file.arrayBuffer());
  const uploaded = await admin.storage.from(SHARED_FILE_BUCKET).upload(storagePath, bytes, {
    contentType,
    upsert: false
  });
  if (uploaded.error) throw new Error(uploaded.error.message);

  const inserted = await admin.from('shared_files').insert({
    id,
    title: title.trim(),
    file_name: file.name,
    content_type: contentType,
    storage_path: storagePath
  });
  if (inserted.error) {
    await admin.storage.from(SHARED_FILE_BUCKET).remove([storagePath]);
    const message = inserted.error.message;
    throw new Error(isMissingSharedFiles(message) ? SETUP_MESSAGE : message);
  }

  revalidatePath('/documents');
}

async function deleteSharedFile(formData: FormData) {
  'use server';
  await requireAdmin('/documents');
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;
  const admin = supabaseAdmin();
  const existing = await admin.from('shared_files').select('storage_path').eq('id', id).maybeSingle();
  if (existing.data?.storage_path && existing.data.storage_path !== 'pending') {
    await admin.storage.from(SHARED_FILE_BUCKET).remove([existing.data.storage_path]);
  }
  await admin.from('shared_files').delete().eq('id', id);
  revalidatePath('/documents');
}

function formatWhen(value: string) {
  return new Date(value).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

export default async function DocumentsPage() {
  await requireAdmin('/documents');
  let rows: SharedFileRow[] = [];
  let loadError: string | null = null;
  try {
    rows = await listSharedFiles();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load files.';
    loadError = isMissingSharedFiles(message) ? SETUP_MESSAGE : message;
  }
  const origin = siteOrigin();

  return (
    <>
      <AdminHeader />
      <main className="container">
        <header className="pageHeader">
          <h2>Files</h2>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            Upload a PDF here. Copy the public link into a notification. The app opens that link
            in Safari, which shows the PDF. No app update is required.
          </p>
        </header>

        <section className="card">
          <h3 className="cardTitle">Upload a file</h3>
          <form action={uploadSharedFile} className="formGrid" encType="multipart/form-data">
            <label>Name</label>
            <input name="title" placeholder="October meeting notice" maxLength={120} required />
            <label>File (PDF, or Word for later)</label>
            <input name="file" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required />
            <button type="submit" className="btnPrimary btnFit">
              Upload
            </button>
          </form>
        </section>

        {loadError ? <p>{loadError}</p> : null}
        {!loadError && rows.length === 0 ? <p>No files yet.</p> : null}

        {rows.map((row) => {
          const pageUrl = publicSharedFilePageUrl(origin, row.id);
          return (
            <section key={row.id} className="card">
              <div className="row" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <h3 className="cardTitle" style={{ marginTop: 0 }}>{row.title}</h3>
                  <p className="muted" style={{ margin: '4px 0' }}>
                    {sharedFileKindLabel(row.content_type)} · {row.file_name} · {formatWhen(row.created_at)}
                  </p>
                  <p style={{ margin: '8px 0' }}>
                    <a href={pageUrl}>{pageUrl}</a>
                  </p>
                  <p className="muted" style={{ margin: 0, wordBreak: 'break-all' }}>
                    {publicStorageFileUrl(supabaseEnv().url, row.storage_path)}
                  </p>
                </div>
                <form action={deleteSharedFile} style={{ margin: 0 }}>
                  <input type="hidden" name="id" value={row.id} />
                  <button type="submit" className="btnDanger">
                    Delete
                  </button>
                </form>
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}
