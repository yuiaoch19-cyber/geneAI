import { createFileRoute } from '@tanstack/react-router'
import { SequenceMapPage } from '@/features/map'

export const Route = createFileRoute('/_authenticated/map')({
  component: SequenceMapPage,
})
