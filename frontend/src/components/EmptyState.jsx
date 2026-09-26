import React from 'react';
import { MessageSquareDashed, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function EmptyState({
  title = 'Nothing here yet',
  description = 'Your feed is quiet right now. Follow other creators or share your first post!',
  icon: Icon = MessageSquareDashed,
  actionText,
  onAction
}) {
  const { isDark } = useTheme();

  return (
    <div
      className={`p-8 sm:p-12 rounded-3xl text-center flex flex-col items-center justify-center transition-all ${isDark
          ? 'bg-white/[0.02] border border-white/[0.06] text-slate-300'
          : 'bg-white border border-slate-200/80 text-slate-700 shadow-xs'
        }`}
    >
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
        <Icon className="w-7 h-7" />
      </div>

      <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm leading-relaxed">
        {description}
      </p>

      {actionText && onAction && (
        <button
          onClick={onAction}
          className={`mt-5 px-5 py-2 rounded-full text-xs font-bold transition-all shadow-sm ${isDark
              ? 'bg-white text-slate-950 hover:bg-slate-100'
              : 'bg-slate-900 text-white hover:bg-black'
            }`}
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
