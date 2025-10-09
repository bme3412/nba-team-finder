declare module '@vercel/analytics/react' {
  import type { FC } from 'react'

  export const Analytics: FC
  export function track(event: string, properties?: Record<string, unknown>): void
}


