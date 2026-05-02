import React from 'react';

const STEP_MAP = {
  'Agent A — Analyzer': 0,
  'Agent B — Task Builder': 1,
  'Agent C — Generator': 2,
  'Agent D — Validator': 3,
  'Applying fixes…': 4,
  'Done!': 5,
};

const COLOR_MAP = {
  blue: { text: 'text-blue-400', border: 'border-blue-500', shadow: 'shadow-blue-500/50' },
  emerald: { text: 'text-emerald-400', border: 'border-emerald-500', shadow: 'shadow-emerald-500/50' },
  orange: { text: 'text-orange-400', border: 'border-orange-500', shadow: 'shadow-orange-500/50' },
  red: { text: 'text-red-400', border: 'border-red-500', shadow: 'shadow-red-500/50' },
  violet: { text: 'text-violet-400', border: 'border-violet-500', shadow: 'shadow-violet-500/50' },
};

const NODES = [
  { id: 0, title: 'Agent A', sub: 'Analyzer', icon: '🤖', x: 50, y: 15, color: 'blue' },
  { id: 1, title: 'Agent B', sub: 'Task Builder', icon: '⚡', x: 85, y: 50, color: 'emerald' },
  { id: 2, title: 'Agent C', sub: 'Generator', icon: '🧠', x: 50, y: 85, color: 'orange' },
  { id: 3, title: 'Agent D', sub: 'Validator', icon: '🔴', x: 15, y: 50, color: 'red' },
];

const PATHS = [
  { id: 0, x1: 50, y1: 15, x2: 85, y2: 50, grad: 'grad0' },
  { id: 1, x1: 85, y1: 50, x2: 50, y2: 85, grad: 'grad1' },
  { id: 2, x1: 50, y1: 85, x2: 15, y2: 50, grad: 'grad2' },
  { id: 3, x1: 15, y1: 50, x2: 50, y2: 50, grad: 'grad3' },
];

const PipelineVisualizer = ({ step, isVisible }) => {
  if (!isVisible) return null;

  const activeIndex = STEP_MAP[step] ?? 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm transition-all duration-300">
      <style>{`
        @keyframes flow {
          from { stroke-dashoffset: 20; }
          to { stroke-dashoffset: 0; }
        }
        .animate-flow {
          animation: flow 0.8s linear infinite;
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
        }
      `}</style>
      
      <div className="relative w-full max-w-3xl aspect-square animate-slide-up">
        {/* SVG Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="grad0" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="grad1" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
            <linearGradient id="grad2" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <linearGradient id="grad3" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          
          {PATHS.map((p, i) => {
            const isSolid = activeIndex > i + 1;
            const isAnimating = activeIndex === i + 1;
            const isEmpty = activeIndex <= i;

            if (isEmpty) {
              return (
                <line key={p.id} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke="#334155" strokeWidth="0.3" strokeDasharray="1 2" />
              );
            }

            return (
              <g key={p.id}>
                {/* Background faint line */}
                <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke="#334155" strokeWidth="0.8" />
                {/* Glowing flow line */}
                <line 
                  x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} 
                  stroke={`url(#${p.grad})`} 
                  strokeWidth={isAnimating ? "1.2" : "0.8"} 
                  strokeDasharray={isAnimating ? "3 3" : "none"}
                  className={isAnimating ? "animate-flow" : ""}
                />
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {NODES.map(node => {
          const state = activeIndex < node.id ? 'idle' : activeIndex === node.id ? 'thinking' : 'done';
          const colors = COLOR_MAP[node.color];

          return (
            <div 
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all duration-500 z-10"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center text-4xl border-2 transition-all duration-500
                ${state === 'done' ? `bg-slate-800 ${colors.border} shadow-lg ${colors.shadow}` : ''}
                ${state === 'thinking' ? `bg-slate-800 ${colors.border} shadow-[0_0_30px_rgba(255,255,255,0.1)] scale-110` : ''}
                ${state === 'idle' ? 'bg-slate-900 border-slate-800 opacity-40 grayscale' : ''}
              `}>
                {state === 'thinking' && (
                  <div className={`absolute inset-0 rounded-2xl border-2 ${colors.border} animate-pulse-ring`}></div>
                )}
                <span className={`transition-transform duration-500 ${state === 'thinking' ? 'scale-110' : ''}`}>{node.icon}</span>
                {state === 'done' && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs border-2 border-slate-900 shadow-sm">
                    ✓
                  </div>
                )}
              </div>
              <div className="mt-4 text-center bg-slate-900/80 px-4 py-1.5 rounded-full border border-slate-800/50 backdrop-blur-sm shadow-xl">
                 <div className={`font-bold text-sm tracking-wide ${state === 'idle' ? 'text-slate-500' : 'text-white'}`}>
                   {node.title}
                 </div>
                 <div className={`text-xs mt-0.5 ${state === 'idle' ? 'text-slate-600' : colors.text}`}>
                   {node.sub}
                 </div>
              </div>
            </div>
          );
        })}

        {/* Center Node (Final Table / Applying Fixes) */}
        {(() => {
          const state = activeIndex < 4 ? 'idle' : activeIndex === 4 ? 'thinking' : 'done';
          const colors = COLOR_MAP.violet;
          return (
            <div 
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all duration-500 z-20"
              style={{ left: `50%`, top: `50%` }}
            >
              <div className={`relative w-24 h-24 rounded-full flex items-center justify-center text-4xl border-4 transition-all duration-500
                ${state === 'done' ? `bg-slate-800 ${colors.border} shadow-[0_0_50px_rgba(139,92,246,0.5)] scale-110` : ''}
                ${state === 'thinking' ? `bg-slate-800 ${colors.border} shadow-[0_0_40px_rgba(139,92,246,0.3)] scale-110` : ''}
                ${state === 'idle' ? 'bg-slate-900 border-slate-800 opacity-30 grayscale' : ''}
              `}>
                {state === 'thinking' && (
                  <div className={`absolute inset-0 rounded-full border-4 ${colors.border} animate-pulse-ring`}></div>
                )}
                <span>📋</span>
                {state === 'done' && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg border-2 border-slate-900 shadow-sm animate-bounce">
                    ✓
                  </div>
                )}
              </div>
              <div className="mt-4 text-center bg-slate-900/80 px-5 py-2 rounded-full border border-slate-800/50 backdrop-blur-sm shadow-xl">
                 <div className={`font-bold text-base tracking-wide ${state === 'idle' ? 'text-slate-500' : 'text-white'}`}>
                   Final Sync Table
                 </div>
                 <div className={`text-xs mt-0.5 ${state === 'idle' ? 'text-slate-600' : colors.text}`}>
                   {state === 'thinking' ? 'Applying Fixes...' : state === 'done' ? 'Ready for Notion' : 'Waiting...'}
                 </div>
              </div>
            </div>
          );
        })()}

      </div>
      
      {/* Footer Text */}
      <div className="absolute bottom-12 text-center w-full">
        <p className={`font-mono text-sm uppercase tracking-widest ${activeIndex === 5 ? 'text-green-400 font-bold scale-110 transition-transform' : 'text-slate-400 animate-pulse'}`}>
          {step === 'Done!' ? 'Pipeline execution successful!' : step || 'Initializing Pipeline...'}
        </p>
      </div>
    </div>
  );
};

export default PipelineVisualizer;
