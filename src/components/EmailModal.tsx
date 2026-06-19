import { useState } from 'react';
import type { EmailDraft } from '../types';

interface Props {
  draft: EmailDraft;
  onClose: () => void;
  onSend: () => void;
}

export default function EmailModal({ draft, onClose, onSend }: Props) {
  const [body, setBody] = useState(draft.body);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(10,20,40,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="bg-white w-full flex flex-col overflow-hidden"
        style={{
          maxWidth: 640,
          margin: '0 24px',
          borderRadius: 20,
          border: '1px solid rgba(15,52,96,0.10)',
          boxShadow: '0 24px 60px rgba(15,52,96,0.22), 0 4px 16px rgba(15,52,96,0.10)',
        }}
      >

        {/* Header */}
        <div
          className="flex items-center justify-between border-b border-slate-100"
          style={{ padding: '20px 24px', background: 'rgba(248,250,252,0.8)' }}
        >
          <div className="flex items-center gap-3">
            {/* Envelope icon */}
            <div
              className="rounded-xl flex items-center justify-center shrink-0"
              style={{
                width: 36,
                height: 36,
                background: 'linear-gradient(140deg, #1976d2 0%, #0f3460 100%)',
                boxShadow: '0 2px 8px rgba(25,118,210,0.28)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="white" strokeWidth="1.4"/>
                <path d="M1.5 6l6.5 4 6.5-4" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>

            <div>
              <p className="font-bold text-[#0f3460] leading-tight" style={{ fontSize: 14 }}>
                Draft Email
              </p>
              <p className="text-slate-400 leading-tight mt-0.5" style={{ fontSize: 11 }}>
                Review and send when ready
              </p>
            </div>

            {/* AI Generated badge */}
            <div
              className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50"
              style={{ padding: '3px 10px', marginLeft: 4 }}
            >
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <circle cx="4.5" cy="4.5" r="3.5" fill="#1976d2" opacity="0.15"/>
                <path d="M2.5 4.5l1.5 1.5L6.5 3" stroke="#1976d2" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span
                className="font-bold text-[#1976d2] uppercase"
                style={{ fontSize: 9, letterSpacing: '0.08em' }}
              >
                AI Generated
              </span>
            </div>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            style={{ width: 32, height: 32 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 2.5l9 9M11.5 2.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* To / Subject */}
        <div style={{ padding: '20px 24px 0' }} className="space-y-3">
          {[
            { label: 'To',      value: draft.to },
            { label: 'Subject', value: draft.subject },
          ].map(field => (
            <div key={field.label} className="flex items-center gap-4">
              <span
                className="font-bold text-slate-400 uppercase shrink-0 text-right"
                style={{ fontSize: 9, letterSpacing: '0.12em', width: 48 }}
              >
                {field.label}
              </span>
              <input
                readOnly
                value={field.value}
                className="flex-1 font-medium text-[#0f3460] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                style={{ fontSize: 13, padding: '9px 14px' }}
              />
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-slate-100 mt-4" />

        {/* Body */}
        <div style={{ padding: '0 24px 4px' }}>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={10}
            className="w-full text-slate-700 font-medium leading-relaxed bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:border-[#1976d2] focus:shadow-[0_0_0_3px_rgba(25,118,210,0.09)] transition-all"
            style={{ fontSize: 13, padding: '14px 16px', marginTop: 16 }}
          />
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between border-t border-slate-100"
          style={{ padding: '16px 24px', background: 'rgba(248,250,252,0.8)' }}
        >
          {/* Demo notice */}
          <div className="flex items-center gap-2 text-slate-400">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="5.5" stroke="#94a3b8" strokeWidth="1.2"/>
              <path d="M6.5 4v3.5" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round"/>
              <circle cx="6.5" cy="9.5" r="0.5" fill="#94a3b8"/>
            </svg>
            <span className="font-medium" style={{ fontSize: 11 }}>
              No email will be sent — demo only
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="font-semibold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              style={{ fontSize: 13, padding: '9px 20px' }}
            >
              Cancel
            </button>
            <button
              onClick={onSend}
              className="font-bold text-white rounded-xl hover:opacity-90 transition-all active:scale-[0.97] flex items-center gap-2"
              style={{
                fontSize: 13,
                padding: '9px 22px',
                background: '#1976d2',
                boxShadow: '0 2px 10px rgba(25,118,210,0.30)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M1.5 6.5L11.5 1.5l-5 10-1.5-4-4-1z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              Send Email
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
