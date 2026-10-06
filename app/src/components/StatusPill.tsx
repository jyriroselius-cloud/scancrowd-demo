import React from 'react';
import type { Status } from '@shared/types';

const STATUS_BG: Record<Status, string> = {
  New: '#9aa7ab',
  Reported: '#9aa7ab',
  Accepted: '#5aa9ff',
  Planned: '#5aa9ff',
  'In repair': '#ffb547',
  Fixed: '#3ddc97',
  Declined: '#ff6b6b',
};

const STATUS_TEXT: Record<Status, string> = {
  New: '#0c1d24',
  Reported: '#0c1d24',
  Accepted: '#04213f',
  Planned: '#04213f',
  'In repair': '#2a1a00',
  Fixed: '#06291b',
  Declined: '#2a0000',
};

interface Props {
  status: Status;
  size?: 'sm' | 'md';
}

export default function StatusPill({ status, size = 'sm' }: Props) {
  const pad = size === 'md' ? '5px 12px' : '3px 8px';
  const font = size === 'md' ? '700 13px Manrope, sans-serif' : '700 11px Manrope, sans-serif';
  return (
    <span
      style={{
        background: STATUS_BG[status],
        color: STATUS_TEXT[status],
        borderRadius: 8,
        padding: pad,
        font,
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {status}
    </span>
  );
}
