import React from 'react';
import { Video, ShieldCheck, Zap, Lock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function StorySection() {
  const { isDark } = useTheme();

  const highlights = [
    {
      icon: Video,
      title: 'Agora RTC Calling',
      desc: '1-on-1 audio/video calling with mic & cam controls',
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20'
    },
    {
      icon: Lock,
      title: 'PIN-Protected Secret Chat',
      desc: 'View-once media & timed auto-delete messaging',
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
    },
    {
      icon: Zap,
      title: 'Real-Time WebSockets',
      desc: 'Live instant messaging, notifications & presence',
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    }
  ];

  return (
    <section
      className={`p-4 rounded-3xl transition-all duration-300 border ${
        isDark
          ? 'bg-white/[0.03] border-white/[0.08]'
          : 'bg-white border-slate-200/80 shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
            Key Capabilities
          </h2>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          Live
        </span>
      </div>

      <div className="space-y-2.5">
        {highlights.map((h, i) => {
          const Icon = h.icon;
          return (
            <div
              key={i}
              className={`p-2.5 rounded-2xl flex items-start gap-2.5 transition-all ${
                isDark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-slate-50/70 border border-slate-100'
              }`}
            >
              <div className={`p-2 rounded-xl border flex-shrink-0 ${h.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {h.title}
                </h4>
                <p className="text-[10px] text-slate-400 leading-snug mt-0.5">
                  {h.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
