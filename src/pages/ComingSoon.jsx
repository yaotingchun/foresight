import { Construction } from 'lucide-react'

export default function ComingSoon({ label, icon: Icon = Construction }) {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-tint">
        <Icon size={30} strokeWidth={1.75} className="text-brand" />
      </span>
      <h2 className="text-xl font-semibold text-ink">Coming Soon</h2>
      <p className="mt-1.5 text-sm text-ink-faint">
        {label} is not available yet — check back shortly.
      </p>
    </div>
  )
}
