import { revalidatePath } from 'next/cache';
import { getServerUser } from '@/lib/supabaseServer';
import AdminHeader from '@/app/components/AdminHeader';
import { isAdminUser } from '@/lib/appUsers';
import { redirectToLogin } from '@/lib/loginRedirect';
import { listSearchQuery, matchesListQuery } from '@/lib/listSearch';
import ListSearch from '@/app/components/ListSearch';

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
  const { supabase, user } = await getServerUser();
  if (!user) redirectToLogin('/quiz');

  try {
    const apiClient: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
    const ok = await isAdminUser(apiClient, user.id);
    if (!ok) redirectToLogin('/quiz');
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

export default async function QuizPage({
  searchParams
}: {
  searchParams?: { q?: string };
}) {
  const { questions, optionsByQuestion } = await getData();
  const query = listSearchQuery(searchParams?.q);
  const filtered = questions.filter((q) => matchesListQuery({ display_name: q.prompt, office_name: q.explanation }, query));

  return (
    <>
      <AdminHeader />
      <main className="container">
      <header className="pageHeader">
        <h2>Quiz Questions</h2>
      </header>
      <ListSearch action="/quiz" query={query} placeholder="Search quiz questions" />

      <section className="card">
        <h3 className="cardTitle">Create new question</h3>
        <form action={upsertQuestion} className="formGrid">
          <input type="hidden" name="id" value="" />
          <textarea
            name="prompt"
            placeholder="Question prompt"
            rows={3}
          />
          <textarea
            name="explanation"
            placeholder="Explanation (optional)"
            rows={2}
          />
          <input
            name="slug"
            placeholder="Slug (optional)"
          />
          <input
            name="position"
            type="number"
            placeholder="Position (e.g. 1, 2, 3)"
            style={{ width: 160 }}
          />
          <label className="checkRow">
            <input type="checkbox" name="is_active" defaultChecked />
            Active
          </label>
          <button type="submit" className="btnPrimary btnFit">
            Save question
          </button>
        </form>
      </section>

      {filtered.length === 0 && <p>{query ? 'No questions match that search.' : 'No questions yet.'}</p>}

      {/* Bulk delete selected questions */}
      {filtered.length > 0 && (
        <form
          id="bulkDeleteForm"
          action={bulkDeleteQuestions}
          className="row"
          style={{ marginBottom: 16 }}
        >
          <span style={{ fontSize: 14 }}>With selected:</span>
          <button type="submit" className="btnDanger">
            Delete selected questions
          </button>
        </form>
      )}

      {filtered.map((q) => (
        <section key={q.id} className="card">
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div style={{ paddingTop: 4 }}>
              <label className="checkRow" style={{ fontSize: 12 }}>
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
              className="formGrid"
              style={{ flex: 1 }}
            >
              <input type="hidden" name="id" defaultValue={q.id} />
              <label>Prompt</label>
              <textarea
                name="prompt"
                defaultValue={q.prompt}
                rows={3}
              />
              <label>Explanation</label>
              <textarea
                name="explanation"
                defaultValue={q.explanation ?? ''}
                rows={2}
              />
              <label>Slug</label>
              <input
                name="slug"
                defaultValue={q.slug ?? ''}
              />
              <label>Position</label>
              <input
                name="position"
                type="number"
                defaultValue={q.position}
                style={{ width: 160 }}
              />
              <label className="checkRow">
                <input type="checkbox" name="is_active" defaultChecked={q.is_active} />
                Active
              </label>
              <button type="submit" className="btnPrimary btnFit">
                Update question
              </button>
            </form>
            <form action={deleteQuestion} style={{ margin: 0 }}>
              <input type="hidden" name="id" value={q.id} />
              <button type="submit" className="btnDanger">
                Delete
              </button>
            </form>
          </div>

          <div style={{ marginTop: 12 }}>
            <h4 className="cardTitle" style={{ marginBottom: 6 }}>Options</h4>
            <table className="table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th style={{ width: 80 }}>Correct</th>
                  <th style={{ width: 90 }}>Position</th>
                  <th style={{ width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {(optionsByQuestion[q.id] ?? []).map((opt) => (
                  <tr key={opt.id}>
                    <td>
                      <form action={upsertOption} className="formInline">
                        <input type="hidden" name="id" defaultValue={opt.id} />
                        <input type="hidden" name="question_id" defaultValue={q.id} />
                        <input
                          name="label"
                          defaultValue={opt.label}
                          style={{ flex: 1 }}
                        />
                        <label className="checkRow" style={{ fontSize: 12 }}>
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
                          style={{ width: 70 }}
                        />
                        <button type="submit" className="btnPrimary">
                          Save
                        </button>
                      </form>
                    </td>
                    <td />
                    <td style={{ textAlign: 'right' }}>
                      <form action={deleteOption}>
                        <input type="hidden" name="id" defaultValue={opt.id} />
                        <button type="submit" className="btnDanger">
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4}>
                    <form action={upsertOption} className="formInline">
                      <input type="hidden" name="question_id" value={q.id} />
                      <input
                        name="label"
                        placeholder="New option label"
                        style={{ flex: 1 }}
                      />
                      <label className="checkRow" style={{ fontSize: 12 }}>
                        <input type="checkbox" name="is_correct" />
                        Correct
                      </label>
                      <input
                        name="position"
                        type="number"
                        placeholder="Pos"
                        style={{ width: 70 }}
                      />
                      <button type="submit" className="btnPrimary">
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
    </>
  );
}

