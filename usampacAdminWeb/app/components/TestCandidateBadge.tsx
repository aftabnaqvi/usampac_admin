import { hiddenCandidateBadge, hiddenCandidateKind } from '@/lib/hiddenTestCandidate';

export default function TestCandidateBadge({ email }: { email?: string | null }) {
  const kind = hiddenCandidateKind(email);
  if (!kind) return null;
  const { label, title } = hiddenCandidateBadge(kind);
  return (
    <span className="badge badgeTest" title={title}>
      {label}
    </span>
  );
}
