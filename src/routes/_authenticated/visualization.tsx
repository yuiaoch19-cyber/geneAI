import { createFileRoute } from '@tanstack/react-router'
import { DataVisualizationPage } from '@/features/visualization'

export const Route = createFileRoute('/_authenticated/visualization')({
  component: DataVisualizationPage,
})
