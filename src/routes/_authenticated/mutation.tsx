import { createFileRoute } from '@tanstack/react-router'
import { MutationSimulationPage } from '@/features/mutation'

export const Route = createFileRoute('/_authenticated/mutation')({
  component: MutationSimulationPage,
})
