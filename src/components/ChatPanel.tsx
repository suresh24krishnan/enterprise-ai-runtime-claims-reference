import { useState, useRef, useEffect } from 'react';
import type { Claim, ChatMessage } from '../types';
import { buildQuery, buildConversation, buildFallbackResponse } from '../data/conversation';

interface Props {
  claim: Claim;
  onGetEmail: () => void;
  emailSent: boolean;
  onViewJourney: () => void;
  onViewDocumentation: () => void;
  initialMessages?: ChatMessage[];
  initialStep?: number;
  onUpdate: (messages: ChatMessage[], step: number) => void;
  journeyEverOpened: boolean;
}

export default function ChatPanel({ claim, onGetEmail, emailSent, onViewJourney, onViewDocumentation, initialMessages, initialStep, onUpdate, journeyEverOpened }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => initialMessages ?? []);
  const [input, setInput] = useState(() => (initialStep ?? 0) > 0 ? '' : buildQuery(claim));
  const [step, setStep] = useState(() => initialStep ?? 0);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    onUpdateRef.current(messages, step);
  }, [messages, step]);

  useEffect(() => {
    if (!emailSent) return;
    setMessages(prev => {
      if (prev.some(m => m.id === 'email-confirm')) return prev;
      return [...prev, {
        id: 'email-confirm',
        sender: 'ai',
        type: 'text',
        content: 'Assignment email sent successfully.',
      }];
    });
  }, [emailSent]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /* Shared step-0 conversation runner — used by typed send AND recommended action */
  const runVerifyCoverage = (text: string) => {
    const convo = buildConversation(claim);
    setMessages(prev => [...prev, { ...convo[0], content: text }]);
    setInput('');
    setIsTyping(true);
    setTimeout(() => setMessages(prev => [...prev, convo[1]]), 800);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, convo[2]]);
      setStep(1);
    }, 2400);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    if (step === 0) {
      runVerifyCoverage(text);
    } else {
      const userId = `user-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        { id: userId, sender: 'user', type: 'text', content: text },
      ]);
      setInput('');
      setIsTyping(true);
      const response = buildFallbackResponse(claim, text);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [
          ...prev,
          { id: `ai-${userId}`, sender: 'ai', type: 'text', content: response },
        ]);
      }, 500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#fff' }}>

      {/* ── Header — QARL branding only ── */}
      <div
        className="flex items-center px-6 shrink-0 border-b border-slate-200"
        style={{ height: 60, background: '#fff' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="rounded-xl shrink-0 flex items-center justify-center"
            style={{
              width: 36, height: 36,
              background: 'linear-gradient(140deg, #1976d2 0%, #0f3460 100%)',
              boxShadow: '0 2px 10px rgba(25,118,210,0.30)',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
              <circle cx="8.5" cy="6.5" r="2.9" stroke="white" strokeWidth="1.5"/>
              <path d="M2.5 15.5c0-3.038 2.686-5 6-5s6 1.962 6 5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="font-black text-[#0f3460] leading-none" style={{ fontSize: 14, letterSpacing: '-0.02em' }}>
              QARL
            </p>
            <p className="font-bold text-slate-400 uppercase leading-none mt-0.5" style={{ fontSize: 9, letterSpacing: '0.12em' }}>
              Claims Assistant
            </p>
          </div>
        </div>
      </div>

      {/* ── Messages / Recommended Actions ── */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ background: '#f8fafc' }}>
        {messages.length === 0 ? (
          <RecommendedActions
            onVerifyCoverage={() => runVerifyCoverage(buildQuery(claim))}
            onStartJourney={onViewJourney}
            onGenerateEmail={onGetEmail}
          />
        ) : (
          <div className="px-7 py-6 space-y-5">
            {messages.map(msg => (
              <Bubble
                key={msg.id}
                msg={msg}
                onAction={id => {
                  if (id === 'get-email') onGetEmail();
                  else if (id === 'open-docs') onViewDocumentation();
                  else if (id === 'open-journey') onViewJourney();
                }}
                journeyEverOpened={journeyEverOpened}
              />
            ))}
            {isTyping && (
              <div className="flex items-end gap-3">
                <QAvatar />
                <div
                  className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm flex items-center gap-2"
                  style={{ padding: '14px 18px', boxShadow: '0 1px 6px rgba(15,52,96,0.07)' }}
                >
                  {[0, 150, 300].map(d => (
                    <span
                      key={d}
                      className="rounded-full bg-[#1976d2] animate-bounce"
                      style={{ width: 7, height: 7, animationDelay: `${d}ms`, display: 'inline-block' }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Post-FNOL Journey CTA ── */}
      {step >= 1 && (
        <div
          className="shrink-0 border-t border-blue-100 flex items-center justify-between"
          style={{ padding: '10px 24px', background: '#eff6ff' }}
        >
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-emerald-400 shrink-0" style={{ width: 6, height: 6 }} />
            <span className="font-semibold text-blue-700" style={{ fontSize: 11 }}>
              Coverage verified for {claim.claimantName}
            </span>
          </div>
          <button
            onClick={onViewJourney}
            className="flex items-center gap-1.5 font-bold text-[#1976d2] hover:text-[#0f3460] transition-colors"
            style={{ fontSize: 12 }}
          >
            View AI Execution Journey
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="shrink-0 border-t border-slate-200" style={{ padding: '14px 24px 12px', background: '#fff' }}>
        <div
          className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl transition-all focus-within:border-[#1976d2] focus-within:shadow-[0_0_0_3px_rgba(25,118,210,0.09)]"
          style={{ height: 50, paddingLeft: 16, paddingRight: 10 }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="shrink-0" style={{ color: '#c8d3e0' }}>
            <rect x="5.25" y="1" width="4.5" height="7.5" rx="2.25" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M2.5 7.5a5 5 0 0010 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="7.5" y1="12.5" x2="7.5" y2="14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Ask QARL a question…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-[#0f3460] placeholder:text-slate-400 font-medium"
            style={{ fontSize: 13 }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="shrink-0 rounded-xl flex items-center justify-center transition-all"
            style={{
              width: 36, height: 36,
              background: input.trim() ? '#1976d2' : '#e8edf3',
              boxShadow: input.trim() ? '0 2px 8px rgba(25,118,210,0.28)' : 'none',
              transition: 'background 0.15s, box-shadow 0.15s',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1 6.5h11M7 2l4.5 4.5L7 11" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <p className="text-center mt-2 font-medium text-slate-300 tracking-wide" style={{ fontSize: 10 }}>
          QARL · AI Claims Assistant · Demo Mode
        </p>
      </div>
    </div>
  );
}

/* ── Recommended Actions empty state ── */

interface RecommendedActionsProps {
  onVerifyCoverage: () => void;
  onStartJourney: () => void;
  onGenerateEmail: () => void;
}

const ACTIONS = [
  {
    id: 'verify',
    title: 'Verify Coverage',
    description: 'Validate policy and coverage details',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1.5L2 4.5v4c0 3.5 2.5 5.8 6 7 3.5-1.2 6-3.5 6-7v-4L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M5.5 8l2 2L11 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'journey',
    title: 'Start AI Journey',
    description: 'Execute the Post-FNOL workflow',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M6 5.5l4.5 2.5L6 10.5V5.5z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'email',
    title: 'Generate Assignment Email',
    description: 'Create the adjuster assignment email',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M1.5 5.5l6.5 4.5 6.5-4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

function RecommendedActions({ onVerifyCoverage, onStartJourney, onGenerateEmail }: RecommendedActionsProps) {
  const handlers: Record<string, () => void> = {
    verify:  onVerifyCoverage,
    journey: onStartJourney,
    email:   onGenerateEmail,
  };

  return (
    <div className="px-7 pt-7 pb-6">
      {/* Heading — primary section weight */}
      <p className="font-black text-[#0f3460] leading-tight" style={{ fontSize: 17, letterSpacing: '-0.01em' }}>
        Recommended Actions
      </p>
      <p className="font-medium text-slate-400 mt-1.5 mb-6" style={{ fontSize: 12 }}>
        QARL can assist with this claim immediately.
      </p>

      {/* Action cards */}
      <div className="space-y-3">
        {ACTIONS.map(action => (
          <button
            key={action.id}
            onClick={handlers[action.id]}
            className="w-full text-left bg-white border border-slate-200 rounded-xl flex items-center gap-4 group transition-colors"
            style={{
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(15,52,96,0.05)',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#f8fbff';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#c7d9f5';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '';
            }}
          >
            {/* Icon */}
            <div
              className="shrink-0 rounded-lg flex items-center justify-center text-[#1976d2]"
              style={{ width: 36, height: 36, background: '#E6F1FB' }}
            >
              {action.icon}
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#0f3460] leading-none mb-1" style={{ fontSize: 13 }}>
                {action.title}
              </p>
              <p className="font-medium text-slate-400 leading-none" style={{ fontSize: 11 }}>
                {action.description}
              </p>
            </div>
            {/* Chevron */}
            <svg
              width="14" height="14" viewBox="0 0 14 14" fill="none"
              className="shrink-0 text-slate-300 group-hover:text-[#1976d2] transition-colors"
            >
              <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ))}
      </div>

      {/* Footer hint */}
      <p className="text-center font-medium text-slate-300 mt-6" style={{ fontSize: 11 }}>
        Or ask QARL anything…
      </p>
    </div>
  );
}

/* ── Sub-components ── */

function QAvatar() {
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0"
      style={{
        width: 30, height: 30, flexShrink: 0,
        background: 'linear-gradient(140deg, #1976d2 0%, #0f3460 100%)',
        boxShadow: '0 2px 6px rgba(25,118,210,0.22)',
      }}
    >
      <span className="text-white font-black" style={{ fontSize: 10 }}>Q</span>
    </div>
  );
}

function Bubble({ msg, onAction, journeyEverOpened }: { msg: ChatMessage; onAction: (id: string) => void; journeyEverOpened: boolean }) {
  if (msg.sender === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="text-white font-medium leading-relaxed rounded-2xl rounded-tr-sm"
          style={{ background: '#0f3460', maxWidth: '62%', fontSize: 13, padding: '12px 18px', boxShadow: '0 2px 12px rgba(15,52,96,0.18)' }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.type === 'status') {
    return (
      <div className="flex items-center gap-4 py-1">
        <div className="h-px flex-1 bg-slate-200" />
        <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-full shrink-0" style={{ padding: '7px 16px' }}>
          <span className="rounded-full bg-[#1976d2] animate-pulse shrink-0" style={{ width: 6, height: 6 }} />
          <span className="font-black text-[#1976d2] uppercase" style={{ fontSize: 10, letterSpacing: '0.14em' }}>
            {msg.content}
          </span>
        </div>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
    );
  }

  if (msg.type === 'result') {
    return <ResultCard msg={msg} onAction={onAction} journeyEverOpened={journeyEverOpened} />;
  }

  const isConfirm = msg.id === 'email-confirm';
  return (
    <div className="flex items-end gap-3">
      <QAvatar />
      <div
        className={`font-medium leading-relaxed rounded-2xl rounded-bl-sm flex items-center gap-2.5 ${
          isConfirm
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : 'bg-white border border-slate-200 text-slate-800'
        }`}
        style={{
          fontSize: 13, maxWidth: '72%', padding: '12px 18px',
          boxShadow: isConfirm ? '0 1px 6px rgba(5,150,105,0.10)' : '0 1px 6px rgba(15,52,96,0.06)',
        }}
      >
        {isConfirm && (
          <div className="rounded-full bg-emerald-200 flex items-center justify-center shrink-0" style={{ width: 20, height: 20 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5l2.5 2.5L8.5 2" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
        {msg.content}
      </div>
    </div>
  );
}

function ResultCard({ msg, onAction, journeyEverOpened }: { msg: ChatMessage; onAction: (id: string) => void; journeyEverOpened: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <QAvatar />
      <div
        className="flex-1 min-w-0 bg-white border border-slate-200 rounded-2xl rounded-tl-sm overflow-hidden"
        style={{ boxShadow: '0 2px 16px rgba(15,52,96,0.08)' }}
      >
        <div style={{ padding: '20px 24px 16px' }}>
          <div className="space-y-4">
            {msg.results?.map((r, i) => (
              <div key={i}>
                {i > 0 && <div className="h-px bg-slate-100" style={{ margin: '0 -24px 16px' }} />}
                <div className="flex items-start gap-3">
                  <div
                    className="rounded-full bg-emerald-100 flex items-center justify-center shrink-0"
                    style={{ width: 20, height: 20, marginTop: 1 }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5l2.5 2.5L8.5 2" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-black text-emerald-600 uppercase mb-1" style={{ fontSize: 9, letterSpacing: '0.10em' }}>
                      {r.label}
                    </p>
                    <p className="font-medium text-slate-700 leading-snug" style={{ fontSize: 13 }}>
                      {r.value}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {msg.followUp && (
          <div className="border-t border-slate-100" style={{ padding: '12px 24px', background: 'rgba(248,250,252,0.7)' }}>
            <div className="flex items-center gap-2">
              <div
                className="rounded-full bg-emerald-100 flex items-center justify-center shrink-0"
                style={{ width: 18, height: 18 }}
              >
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path d="M1.5 4.5l2 2L7.5 2" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="font-semibold text-slate-600 leading-none" style={{ fontSize: 12 }}>
                {msg.followUp}
              </p>
            </div>
          </div>
        )}

        {!journeyEverOpened && (
          <div className="border-t border-slate-100" style={{ padding: '14px 24px' }}>
            <button
              onClick={() => onAction('open-journey')}
              className="w-full flex items-center justify-center gap-2.5 font-bold text-white rounded-xl transition-all hover:opacity-90 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              style={{
                height: 44, fontSize: 13,
                background: '#1976d2',
                boxShadow: '0 2px 12px rgba(25,118,210,0.32)',
                cursor: 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
                <path d="M2 7.5h11M9 3.5l4 4-4 4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Open AI Workflow
            </button>
          </div>
        )}

        {msg.actions && msg.actions.length > 0 && (
          <div className="border-t border-slate-100" style={{ padding: '14px 24px' }}>
            {msg.actions.map(action =>
              action.id === 'open-docs' ? (
                <button
                  key={action.id}
                  onClick={() => onAction(action.id)}
                  className="w-full flex items-center justify-center gap-2.5 font-bold text-white rounded-xl transition-all hover:opacity-90 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  style={{
                    height: 44, fontSize: 13,
                    background: '#1976d2',
                    boxShadow: '0 2px 12px rgba(25,118,210,0.32)',
                    cursor: 'pointer',
                    letterSpacing: '-0.01em',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
                    <rect x="2" y="1" width="11" height="13" rx="1.5" stroke="white" strokeWidth="1.4"/>
                    <path d="M4.5 5h6M4.5 7.5h6M4.5 10h3.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  {action.label}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M2.5 7h9M8 3.5l3.5 3.5L8 10.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              ) : (
                <button
                  key={action.id}
                  onClick={() => onAction(action.id)}
                  className={`font-bold tracking-wide rounded-xl transition-all ${
                    action.variant === 'primary'
                      ? 'text-white hover:opacity-90 active:scale-[0.97]'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 active:scale-[0.97]'
                  }`}
                  style={{
                    fontSize: 12, padding: '9px 20px',
                    ...(action.variant === 'primary' ? {
                      background: '#1976d2',
                      boxShadow: '0 2px 8px rgba(25,118,210,0.28)',
                    } : {}),
                  }}
                >
                  {action.label}
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
