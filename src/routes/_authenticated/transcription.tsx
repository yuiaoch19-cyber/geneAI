import { createFileRoute } from '@tanstack/react-router'
import { TranscriptionPage } from '@/features/transcription'

export const Route = createFileRoute('/_authenticated/transcription')({
  component: TranscriptionPage,
})
