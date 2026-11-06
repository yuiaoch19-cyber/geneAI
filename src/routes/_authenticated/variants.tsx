import { createFileRoute } from '@tanstack/react-router'
import { VariantDatabasePage } from '@/features/variants'

export const Route = createFileRoute('/_authenticated/variants')({
  component: VariantDatabasePage,
})
