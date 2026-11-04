import { createFileRoute } from '@tanstack/react-router'
import { AnalysisHistoryPage } from '@/features/history'

export const Route = createFileRoute('/_authenticated/history')({
  component: AnalysisHistoryPage,
})
