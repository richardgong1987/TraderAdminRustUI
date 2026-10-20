import type { Outcome } from '@/api/ai'

export const OUTCOME_COLOR: Record<Outcome, string> = { CORRECT: 'green', WRONG: 'red', ERROR: 'orange' }
