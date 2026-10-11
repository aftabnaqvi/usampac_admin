import { isHiddenTestCandidateEmail } from '@/lib/hiddenTestCandidate';

export default function TestCandidateBadge({ email }: { email?: string | null }) {
  if (!isHiddenTestCandidateEmail(email)) return null;
  return <span className="badge badgeTest">TEST</span>;
}
