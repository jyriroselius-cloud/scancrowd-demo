import React from 'react';
import { statusColors, statusTextColors } from '@shared/theme';
import type { Status } from '@shared/types';

interface Props {
  status: Status | string;
  size?: 'sm' | 'md';
}

export function StatusPill({ status, size = 'sm' }: Props) {
  const bg = statusColors[status] ?? '#2a4650';
  const color = statusTextColors[status] ?? '#ffffff';
  return (
    <span
      style={{
        background: bg,
        color,
        borderRadius: 8,
        padding: size === 'sm' ? '4px 10px' : '5px 12px',
        font: `700 ${size === 'sm' ? 12 : 13}px Manrope, sans-serif`,
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {status}
    </span>
  );
}
