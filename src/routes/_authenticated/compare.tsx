import { createFileRoute } from '@tanstack/react-router'
import { SequenceComparePage } from '@/features/compare'

export const Route = createFileRoute('/_authenticated/compare')({
  component: SequenceComparePage,
})
