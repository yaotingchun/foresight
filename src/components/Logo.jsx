import foresightLogo from '../assets/logo_foresight.png'

export default function Logo() {
  return (
    <div className="flex items-center gap-2 px-4 py-5">
      <img
        src={foresightLogo}
        alt="Foresight.ai Logo"
        className="h-[36px] w-[36px] shrink-0 object-contain"
      />
      <div className="leading-tight">
        <div className="text-[20px] font-bold text-ink">
          Foresight<span className="text-status-blue">.ai</span>
        </div>
        <div className="text-[10px] font-medium text-ink-faint tracking-tight">
          IT System Monitoring
        </div>
      </div>
    </div>
  )
}
