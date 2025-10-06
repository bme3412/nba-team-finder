export default function SkeletonLine({ width = 'w-11/12' }: { width?: string }) {
  return <div className={`h-3.5 ${width} animate-pulse rounded bg-slate-200`} />
}


