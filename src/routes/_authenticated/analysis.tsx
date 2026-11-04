import { createFileRoute } from '@tanstack/react-router'
import { SequenceAnalysisPage } from '@/features/analysis'

export const Route = createFileRoute('/_authenticated/analysis')({
  component: SequenceAnalysisPage,
})
