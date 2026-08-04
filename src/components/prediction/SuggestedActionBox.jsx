import { ShieldAlert, AlertTriangle, CheckCircle, Clock, Loader2, Sparkles, AlertCircle } from 'lucide-react'

const STYLES = {
  critical: {
    box: 'rounded-xl border border-red-200 bg-red-50/80 p-3.5 mt-3.5 text-left shadow-sm',
    label: 'text-[11px] font-bold uppercase tracking-wider text-red-800',
    title: 'text-[12.5px] font-bold text-red-950',
    text: 'text-[12px] leading-relaxed text-red-900',
    optionBox: 'rounded-lg border border-red-200/90 bg-white/70 p-3 shadow-xs hover:bg-white/90 transition-colors',
    timelineBorder: 'border-t border-red-200/80 text-red-900',
    icon: ShieldAlert,
    iconColor: 'text-red-600',
    badge: 'bg-red-100/90 text-red-800 border border-red-300/60',
  },
  warning: {
    box: 'rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 mt-3.5 text-left shadow-sm',
    label: 'text-[11px] font-bold uppercase tracking-wider text-amber-800',
    title: 'text-[12.5px] font-bold text-amber-950',
    text: 'text-[12px] leading-relaxed text-amber-900',
    optionBox: 'rounded-lg border border-amber-200/90 bg-white/70 p-3 shadow-xs hover:bg-white/90 transition-colors',
    timelineBorder: 'border-t border-amber-200/80 text-amber-900',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    badge: 'bg-amber-100/90 text-amber-800 border border-amber-300/60',
  },
  healthy: {
    box: 'rounded-xl border border-emerald-200/90 bg-emerald-50/60 p-3.5 mt-3.5 text-left shadow-sm',
    label: 'text-[11px] font-bold uppercase tracking-wider text-emerald-800',
    title: 'text-[12.5px] font-bold text-emerald-950',
    text: 'text-[12px] leading-relaxed text-emerald-900',
    optionBox: 'rounded-lg border border-emerald-200/90 bg-white/70 p-3 shadow-xs hover:bg-white/90 transition-colors',
    timelineBorder: 'border-t border-emerald-200/80 text-emerald-900',
    icon: CheckCircle,
    iconColor: 'text-emerald-600',
    badge: 'bg-emerald-100/90 text-emerald-800 border border-emerald-300/60',
  },
}

export default function SuggestedActionBox({ recommendation, compact = false }) {
  if (!recommendation) return null

  const riskLevel = recommendation.riskLevel || recommendation.risk_level || 'healthy'
  const s = STYLES[riskLevel] || STYLES.healthy
  const Icon = s.icon

  // Determine suggestions list (support both new array format and legacy single format)
  let suggestions = []
  if (Array.isArray(recommendation.suggestions) && recommendation.suggestions.length > 0) {
    suggestions = recommendation.suggestions
  } else if (recommendation.title && recommendation.text) {
    suggestions = [{
      option: 'Option A',
      title: recommendation.title,
      text: recommendation.text,
    }]
  }

  const timeline = recommendation.timeline
  const errorMsg = recommendation.error

  return (
    <div className={`${s.box} ${compact ? '!p-2.5 !mt-2.5' : ''}`}>
      <div className="flex items-start gap-2.5">
        <Icon size={16} className={`${s.iconColor} shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-indigo-600" />
              <span className={s.label}>AI SUGGESTED ACTIONS</span>
            </div>
            {errorMsg && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-slate-200/80 text-slate-700 border border-slate-300">
                <AlertCircle size={11} className="text-slate-600" />
                {errorMsg}
              </span>
            )}
          </div>

          {/* Suggestions Cards (Option A & Option B side-by-side) */}
          <div className={
            compact || suggestions.length === 1
              ? 'flex flex-col gap-2 mt-2.5'
              : 'grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5'
          }>
            {suggestions.map((item, idx) => (
              <div key={idx} className={s.optionBox}>
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide shrink-0 ${s.badge}`}>
                    {item.option || `Option ${String.fromCharCode(65 + idx)}`}
                  </span>
                  <span className="text-[12.5px] font-bold text-slate-900 truncate">
                    {item.title}
                  </span>
                </div>
                <p className={`${s.text} mt-1.5 text-[11.5px] leading-relaxed`}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          {/* Escalation Timeline Footer */}
          {timeline && (
            <div className={`flex items-center gap-1.5 mt-3 pt-2.5 ${s.timelineBorder} text-[11px] font-semibold`}>
              <Clock size={12} className={`${s.iconColor} shrink-0`} />
              <span>Escalation Timeline: {timeline}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
