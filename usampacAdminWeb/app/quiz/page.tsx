import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabaseServer';
import AdminHeader from '@/app/components/AdminHeader';

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      // replace non-alphanumerics with dashes
      .replace(/[^a-z0-9]+/g, '-')
      // trim leading/trailing dashes
      .replace(/^-+|-+$/g, '')
      // keep slugs reasonably short
      .slice(0, 80) || 'question'
  );
}

type QuizQuestion = {
  id: string;
  slug: string | null;
  prompt: string;
  explanation: string | null;
  position: number;
  is_active: boolean;
};

type QuizOption = {
  id: string;
  question_id: string;
  label: string;
  is_correct: boolean;
  position: number;
};

async function requireAdmin() {
  const supabase = supabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user ?? null;
  if (!user) redirect('/login');

  try {
    const apiClient: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
    const { data: roleRow } = await apiClient
      .from('app_users')
      .select('role')
      .eq('auth_sub', user.id)
      .limit(1)
      .single();
    if (!roleRow || roleRow.role !== 'ADMIN') {
      redirect('/login');
    }
  } catch {
    // rely on RLS if this check fails
  }
  return supabase;
}

async function getData() {
  const supabase = await requireAdmin();
  const apiClient: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

  const [{ data: questions, error: questionsError }, { data: options, error: optionsError }] =
    await Promise.all([
      apiClient.from('quiz_questions').select('*').order('position', { ascending: true }),
      apiClient.from('quiz_options').select('*').order('position', { ascending: true })
    ]);

  if (questionsError || optionsError) {
    console.error('DEBUG quiz.getData error', questionsError, optionsError);
    throw new Error(questionsError?.message ?? optionsError?.message ?? 'Failed to load quiz data');
  }

  const grouped: Record<string, QuizOption[]> = {};
  (options ?? []).forEach((opt: QuizOption) => {
    if (!grouped[opt.question_id]) grouped[opt.question_id] = [];
    grouped[opt.question_id].push(opt);
  });

  return {
    questions: (questions ?? []) as QuizQuestion[],
    optionsByQuestion: grouped
  };
}

async function upsertQuestion(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string | null) ?? null;
  const prompt = (formData.get('prompt') as string | null) ?? null;
  const explanation = (formData.get('explanation') as string | null) ?? null;
  const slugRaw = (formData.get('slug') as string | null) ?? null;
  const positionRaw = (formData.get('position') as string | null) ?? null;
  const isActive = formData.get('is_active') === 'on';

  if (!prompt || prompt.trim() === '') return;

  const normalizedPrompt = prompt.trim();
  const effectiveSlug =
    slugRaw && slugRaw.trim() !== '' ? slugRaw.trim() : slugify(normalizedPrompt);
  const position = positionRaw ? parseInt(positionRaw, 10) || 0 : 0;

  const supabase = await requireAdmin();
  const apiClient: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

  const payload: Partial<QuizQuestion> = {
    prompt: normalizedPrompt,
    explanation: explanation && explanation.trim() !== '' ? explanation.trim() : null,
    slug: effectiveSlug,
    position,
    is_active: isActive
  };

  let error;
  if (id && id.trim() !== '') {
    ({ error } = await apiClient.from('quiz_questions').update(payload).eq('id', id));
  } else {
    ({ error } = await apiClient.from('quiz_questions').insert(payload));
  }

  if (error) {
    console.error('DEBUG quiz.upsertQuestion error', error);
    throw new Error(error.message);
  }

  revalidatePath('/quiz');
}

async function deleteQuestion(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string | null) ?? null;
  if (!id) return;

  const supabase = await requireAdmin();
  const apiClient: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
  const { error } = await apiClient.from('quiz_questions').delete().eq('id', id);
  if (error) {
    console.error('DEBUG quiz.deleteQuestion error', error);
    throw new Error(error.message);
  }
  revalidatePath('/quiz');
}

async function bulkDeleteQuestions(formData: FormData) {
  'use server';
  const ids = (formData.getAll('ids') as string[]).filter(Boolean);
  if (!ids.length) return;

  const supabase = await requireAdmin();
  const apiClient: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

  // Delete options first (if cascade is not configured)
  const { error: optError } = await apiClient.from('quiz_options').delete().in('question_id', ids);
  if (optError) {
    console.error('DEBUG quiz.bulkDeleteQuestions options error', optError);
    throw new Error(optError.message);
  }

  const { error } = await apiClient.from('quiz_questions').delete().in('id', ids);
  if (error) {
    console.error('DEBUG quiz.bulkDeleteQuestions error', error);
    throw new Error(error.message);
  }

  revalidatePath('/quiz');
}

async function upsertOption(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string | null) ?? null;
  const questionId = (formData.get('question_id') as string | null) ?? null;
  const label = (formData.get('label') as string | null) ?? null;
  const positionRaw = (formData.get('position') as string | null) ?? null;
  const isCorrect = formData.get('is_correct') === 'on';

  if (!questionId || !label) return;

  const position = positionRaw ? parseInt(positionRaw, 10) || 0 : 0;

  const supabase = await requireAdmin();
  const apiClient: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

  const payload: Partial<QuizOption> = {
    question_id: questionId,
    label: label.trim(),
    is_correct: isCorrect,
    position
  } as any;

  let error;
  if (id && id.trim() !== '') {
    ({ error } = await apiClient.from('quiz_options').update(payload).eq('id', id));
  } else {
    ({ error } = await apiClient.from('quiz_options').insert(payload));
  }

  if (error) {
    console.error('DEBUG quiz.upsertOption error', error);
    throw new Error(error.message);
  }

  revalidatePath('/quiz');
}

async function deleteOption(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string | null) ?? null;
  if (!id) return;

  const supabase = await requireAdmin();
  const apiClient: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
  const { error } = await apiClient.from('quiz_options').delete().eq('id', id);
  if (error) {
    console.error('DEBUG quiz.deleteOption error', error);
    throw new Error(error.message);
  }
  revalidatePath('/quiz');
}

export default async function QuizPage() {
  const { questions, optionsByQuestion } = await getData();

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '0 12px' }}>
      <AdminHeader />
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '16px 0 20px'
        }}
      >
        <h2>Quiz Questions</h2>
        <nav style={{ display: 'flex', gap: 12 }}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/pending">Pending</Link>
          <Link href="/approved">Approved</Link>
          <Link href="/rejected">Rejected</Link>
        </nav>
      </header>

      {/* Create new question */}
      <section
        style={{
          border: '1px solid #eee',
          padding: 16,
          borderRadius: 8,
          marginBottom: 24
        }}
      >
        <h3 style={{ marginTop: 0 }}>Create new question</h3>
        <form action={upsertQuestion} style={{ display: 'grid', gap: 8, maxWidth: 640 }}>
          <input type="hidden" name="id" value="" />
          <textarea
            name="prompt"
            placeholder="Question prompt"
            rows={3}
            style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
          />
          <textarea
            name="explanation"
            placeholder="Explanation (optional)"
            rows={2}
            style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
          />
          <input
            name="slug"
            placeholder="Slug (optional)"
            style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
          />
          <input
            name="position"
            type="number"
            placeholder="Position (e.g. 1, 2, 3)"
            style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', width: 160 }}
          />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" name="is_active" defaultChecked />
            Active
          </label>
          <button
            type="submit"
            style={{ alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 6 }}
          >
            Save question
          </button>
        </form>
      </section>

      {questions.length === 0 && <p>No questions yet.</p>}

      {/* Bulk delete selected questions */}
      {questions.length > 0 && (
        <form
          id="bulkDeleteForm"
          action={bulkDeleteQuestions}
          style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}
        >
          <span style={{ fontSize: 14 }}>With selected:</span>
          <button
            type="submit"
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 14,
              backgroundColor: '#fee2e2'
            }}
          >
            Delete selected questions
          </button>
        </form>
      )}

      {questions.map((q) => (
        <section
          key={q.id}
          style={{
            border: '1px solid #eee',
            padding: 16,
            borderRadius: 8,
            marginBottom: 20
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {/* Checkbox participates in bulk delete form via form attribute */}
            <div style={{ paddingTop: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                <input
                  type="checkbox"
                  name="ids"
                  value={q.id}
                  form="bulkDeleteForm"
                  style={{ margin: 0 }}
                />
                Select
              </label>
            </div>
            <form
              action={upsertQuestion}
              style={{ display: 'grid', gap: 6, maxWidth: 640, flex: 1 }}
            >
              <input type="hidden" name="id" defaultValue={q.id} />
              <label style={{ fontSize: 12, color: '#666' }}>Prompt</label>
              <textarea
                name="prompt"
                defaultValue={q.prompt}
                rows={3}
                style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd' }}
              />
              <label style={{ fontSize: 12, color: '#666' }}>Explanation</label>
              <textarea
                name="explanation"
                defaultValue={q.explanation ?? ''}
                rows={2}
                style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd' }}
              />
              <label style={{ fontSize: 12, color: '#666' }}>Slug</label>
              <input
                name="slug"
                defaultValue={q.slug ?? ''}
                style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd' }}
              />
              <label style={{ fontSize: 12, color: '#666' }}>Position</label>
              <input
                name="position"
                type="number"
                defaultValue={q.position}
                style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd', width: 160 }}
              />
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                <input type="checkbox" name="is_active" defaultChecked={q.is_active} />
                Active
              </label>
              <button
                type="submit"
                style={{ padding: '6px 12px', borderRadius: 6, fontSize: 14, marginTop: 6 }}
              >
                Update question
              </button>
            </form>
            <form action={deleteQuestion} style={{ margin: 0 }}>
              <input type="hidden" name="id" value={q.id} />
              <button
                type="submit"
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 14,
                  backgroundColor: '#fee2e2'
                }}
              >
                Delete
              </button>
            </form>
          </div>

          <div style={{ marginTop: 12 }}>
            <h4 style={{ margin: '8px 0' }}>Options</h4>
            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '4px 6px' }}>Label</th>
                  <th style={{ textAlign: 'center', padding: '4px 6px', width: 80 }}>Correct</th>
                  <th style={{ textAlign: 'left', padding: '4px 6px', width: 90 }}>Position</th>
                  <th style={{ width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {(optionsByQuestion[q.id] ?? []).map((opt) => (
                  <tr key={opt.id}>
                    <td style={{ padding: '4px 6px' }}>
                      <form action={upsertOption} style={{ display: 'flex', gap: 8 }}>
                        <input type="hidden" name="id" defaultValue={opt.id} />
                        <input type="hidden" name="question_id" defaultValue={q.id} />
                        <input
                          name="label"
                          defaultValue={opt.label}
                          style={{
                            flex: 1,
                            padding: 4,
                            borderRadius: 4,
                            border: '1px solid #ddd'
                          }}
                        />
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12
                          }}
                        >
                          <input
                            type="checkbox"
                            name="is_correct"
                            defaultChecked={opt.is_correct}
                          />
                          Correct
                        </label>
                        <input
                          name="position"
                          type="number"
                          defaultValue={opt.position}
                          style={{
                            width: 70,
                            padding: 4,
                            borderRadius: 4,
                            border: '1px solid #ddd'
                          }}
                        />
                        <button
                          type="submit"
                          style={{ padding: '4px 10px', borderRadius: 4 }}
                        >
                          Save
                        </button>
                      </form>
                    </td>
                    <td />
                    <td style={{ textAlign: 'right', paddingRight: 6 }}>
                      <form action={deleteOption}>
                        <input type="hidden" name="id" defaultValue={opt.id} />
                        <button
                          type="submit"
                          style={{
                            padding: '4px 8px',
                            borderRadius: 4,
                            backgroundColor: '#fee2e2',
                            fontSize: 12
                          }}
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} style={{ paddingTop: 8 }}>
                    <form
                      action={upsertOption}
                      style={{ display: 'flex', gap: 8, marginTop: 4 }}
                    >
                      <input type="hidden" name="question_id" value={q.id} />
                      <input
                        name="label"
                        placeholder="New option label"
                        style={{
                          flex: 1,
                          padding: 4,
                          borderRadius: 4,
                          border: '1px solid #ddd'
                        }}
                      />
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12
                        }}
                      >
                        <input type="checkbox" name="is_correct" />
                        Correct
                      </label>
                      <input
                        name="position"
                        type="number"
                        placeholder="Pos"
                        style={{
                          width: 70,
                          padding: 4,
                          borderRadius: 4,
                          border: '1px solid #ddd'
                        }}
                      />
                      <button
                        type="submit"
                        style={{ padding: '4px 10px', borderRadius: 4 }}
                      >
                        Add
                      </button>
                    </form>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </main>
  );
}

