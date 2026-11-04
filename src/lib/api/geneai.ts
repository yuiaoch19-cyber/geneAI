import type {
  AnalysisPage,
  AnalysisRecord,
  AnalysisSource,
  BaseCounts,
  GcWindows,
  StatsOverview,
} from '@/types/api'
import { api } from './client'

interface RawAnalysis {
  id: number
  name: string
  sequence: string
  length: number
  a_count: number
  t_count: number
  g_count: number
  c_count: number
  n_count: number
  gc_content: number
  at_content: number
  complement: string
  reverse_complement: string
  rna: string
  source: AnalysisSource
  note: string | null
  created_at: string
}

interface RawPage {
  items: RawAnalysis[]
  total: number
  page: number
  page_size: number
  pages: number
}

interface RawStats {
  total_analyses: number
  total_sequences: number
  average_gc: number | null
  last_analyzed_at: string | null
  base_counts: BaseCounts
  gc_trend: { id: number; name: string; gc_content: number; created_at: string }[]
  recent: {
    id: number
    name: string
    length: number
    gc_content: number
    created_at: string
  }[]
}

function toRecord(raw: RawAnalysis): AnalysisRecord {
  return {
    id: raw.id,
    name: raw.name,
    sequence: raw.sequence,
    length: raw.length,
    counts: {
      a: raw.a_count,
      t: raw.t_count,
      g: raw.g_count,
      c: raw.c_count,
      n: raw.n_count,
    },
    gcContent: raw.gc_content,
    atContent: raw.at_content,
    complement: raw.complement,
    reverseComplement: raw.reverse_complement,
    rna: raw.rna,
    source: raw.source,
    note: raw.note,
    createdAt: raw.created_at,
  }
}

export interface CreateAnalysisInput {
  name?: string
  sequence: string
  source?: AnalysisSource
  note?: string
}

export async function createAnalysis(input: CreateAnalysisInput): Promise<AnalysisRecord> {
  const raw = await api.post<RawAnalysis>('/analyses', {
    name: input.name,
    sequence: input.sequence,
    source: input.source ?? 'manual',
    note: input.note,
  })
  return toRecord(raw)
}

export async function listAnalyses(params: {
  q?: string
  page?: number
  pageSize?: number
} = {}): Promise<AnalysisPage> {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  search.set('page', String(params.page ?? 1))
  search.set('page_size', String(params.pageSize ?? 10))

  const raw = await api.get<RawPage>(`/analyses?${search.toString()}`)
  return {
    items: raw.items.map(toRecord),
    total: raw.total,
    page: raw.page,
    pageSize: raw.page_size,
    pages: raw.pages,
  }
}

export async function getAnalysis(id: number): Promise<AnalysisRecord> {
  return toRecord(await api.get<RawAnalysis>(`/analyses/${id}`))
}

export async function deleteAnalysis(id: number): Promise<void> {
  await api.delete(`/analyses/${id}`)
}

export async function getStatsOverview(): Promise<StatsOverview> {
  const raw = await api.get<RawStats>('/stats/overview')
  return {
    totalAnalyses: raw.total_analyses,
    totalSequences: raw.total_sequences,
    averageGc: raw.average_gc,
    lastAnalyzedAt: raw.last_analyzed_at,
    baseCounts: raw.base_counts,
    gcTrend: raw.gc_trend.map((point) => ({
      id: point.id,
      name: point.name,
      gcContent: point.gc_content,
      createdAt: point.created_at,
    })),
    recent: raw.recent.map((item) => ({
      id: item.id,
      name: item.name,
      length: item.length,
      gcContent: item.gc_content,
      createdAt: item.created_at,
    })),
  }
}

export async function getGcWindows(
  id: number,
  window = 50,
  step = 10
): Promise<GcWindows> {
  return api.get<GcWindows>(
    `/analyses/${id}/gc-windows?window=${window}&step=${step}`
  )
}
