interface NavBarProps {
  onLogoClick: () => void;
}

export default function NavBar({ onLogoClick }: NavBarProps) {
  return (
    <nav
      className="flex items-center justify-between px-8 shrink-0"
      style={{
        height: 60,
        background: '#0f3460',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 2px 12px rgba(15,52,96,0.30)',
      }}
    >
      {/* Brand */}
      <button
        onClick={onLogoClick}
        className="flex items-center gap-3 group"
      >
        <div
          className="rounded-xl flex items-center justify-center shrink-0 transition-opacity group-hover:opacity-90"
          style={{
            width: 32,
            height: 32,
            background: 'linear-gradient(140deg, #1976d2 0%, #1256a0 100%)',
            boxShadow: '0 2px 8px rgba(25,118,210,0.40)',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="5.5" r="2.5" fill="white"/>
            <path d="M2 13.5c0-3.038 2.462-5 5.5-5s5.5 1.962 5.5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="flex flex-col items-start gap-0.5">
          <span
            className="text-white font-black leading-none"
            style={{ fontSize: 14, letterSpacing: '-0.01em' }}
          >
            QARL
          </span>
          <span
            className="text-blue-300 font-bold leading-none"
            style={{ fontSize: 9, letterSpacing: '0.18em' }}
          >
            CLAIMS ASSISTANT
          </span>
        </div>
      </button>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* All Systems Online */}
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-1.5"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <span
            className="rounded-full bg-emerald-400 shrink-0"
            style={{ width: 6, height: 6, boxShadow: '0 0 6px rgba(52,211,153,0.7)' }}
          />
          <span className="text-blue-100 font-medium" style={{ fontSize: 11 }}>
            All Systems Online
          </span>
        </div>

        {/* Divider */}
        <div className="h-5 w-px" style={{ background: 'rgba(255,255,255,0.12)' }} />

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <p className="text-white font-semibold leading-none" style={{ fontSize: 12 }}>
              Sarah Mitchell
            </p>
            <p className="text-blue-300 leading-none mt-0.5" style={{ fontSize: 10 }}>
              Senior Adjuster
            </p>
          </div>
          <div
            className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
            style={{
              width: 32,
              height: 32,
              background: 'linear-gradient(140deg, #1976d2 0%, #1256a0 100%)',
              boxShadow: '0 2px 6px rgba(25,118,210,0.35)',
              fontSize: 11,
              letterSpacing: '0.02em',
            }}
          >
            SM
          </div>
        </div>
      </div>
    </nav>
  );
}
