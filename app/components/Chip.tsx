type ChipProps = {
  children: React.ReactNode
  tone?: 'default' | 'blue' | 'violet' | 'amber' | 'slate'
  className?: string
}

const toneMap: Record<NonNullable<ChipProps['tone']>, string> = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  slate: 'bg-slate-50 text-slate-700 border-slate-200'
}

export default function Chip({ children, tone = 'default', className = '' }: ChipProps) {
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${toneMap[tone]} ${className}`}>{children}</span>
  )
}


