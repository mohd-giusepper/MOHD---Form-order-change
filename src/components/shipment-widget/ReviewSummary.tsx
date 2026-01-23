import type { ReactNode } from 'react';

type ReviewSummaryProps = {
  title: string;
  children: ReactNode;
};

export default function ReviewSummary({ title, children }: ReviewSummaryProps) {
  return (
    <div className="sssw-review">
      <p className="sssw-review-title">{title}</p>
      <div className="sssw-review-content">{children}</div>
    </div>
  );
}
