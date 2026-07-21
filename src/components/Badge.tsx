import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  tone?: 'purple' | 'cyan' | 'green' | 'yellow' | 'red' | 'gray' | 'pink';
}

export function Badge({ children, tone = 'gray' }: BadgeProps) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
