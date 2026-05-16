// src/components/chat/AttachmentMenu.tsx
//
// Dropdown menu for attaching files or sharing entities in chat.
// Options: Image, Document, Lead, Job, Invoice, Quote, Asset

'use client';

import { useRef, useEffect } from 'react';
import type { ShareEntityType } from './SharePicker';

export type AttachmentAction = 'image' | 'document' | ShareEntityType;

interface AttachmentMenuProps {
  open: boolean;
  onClose: () => void;
  onSelectFile: (category: 'image' | 'document') => void;
  onSelectEntity: (entityType: ShareEntityType) => void;
}

export function AttachmentMenu({ open, onClose, onSelectFile, onSelectEntity }: AttachmentMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const items: { icon: string; label: string; action: () => void }[] = [
    {
      icon: '📷',
      label: 'Image',
      action: () => { onSelectFile('image'); onClose(); },
    },
    {
      icon: '📎',
      label: 'Document',
      action: () => { onSelectFile('document'); onClose(); },
    },
    {
      icon: '🟢',
      label: 'Share Lead',
      action: () => { onSelectEntity('lead'); onClose(); },
    },
    {
      icon: '🔧',
      label: 'Share Job',
      action: () => { onSelectEntity('job'); onClose(); },
    },
    {
      icon: '👤',
      label: 'Share Contact',
      action: () => { onSelectEntity('client_profile'); onClose(); },
    },
  ];

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full left-0 mb-2 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.action}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition hover:bg-gray-50"
        >
          <span className="text-base">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
