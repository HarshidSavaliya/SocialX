import React from 'react';
import { Camera, Sparkles, Clock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function StorySection() {
  const { isDark } = useTheme();

  return (
    <section
      className={`p-4 rounded-3xl transition-all duration-300 border ${isDark
          ? 'bg-white/[0.03] border-white/[0.08]'
          : 'bg-white border-slate-200/80 shadow-xs'
        }`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
            Stories
          </h2>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          Phase 3
        </span>
      </div>

      {/* Structured placeholder state */}
      <div
        className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center border border-dashed ${isDark
            ? 'border-white/10 bg-white/[0.02] text-slate-400'
            : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}
      >
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-2 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
          <Camera className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
          No Live Stories Active
        </h4>
        <p className="text-[11px] mt-1 leading-relaxed max-w-[200px]">
          Ephemeral 24-hour stories module will activate in Phase 3. Share media posts directly on your main feed!
        </p>
      </div>
    </section>
  );
}
