import type {
  AnalysisPage,
  AnalysisRecord,
  AnalysisSource,
  BaseCounts,
  ComparisonPage,
  ComparisonRecord,
  ComparisonResult,
  ComparisonScoring,
  GcWindows,
  SequenceDifference,
  StatsOverview,
} from '@/types/api'
import { api } from './client'

interface RawDifference {
  type: SequenceDifference['type']
  ref_position: number
  query_position: number
  ref_base: string | null
  query_base: string | null
}

interface RawComparison {
  id?: number
  name?: string
  created_at?: string
  reference_name: string
  query_name: string
  reference_sequence: string
  query_sequence: string
  reference_length: number
  query_length: number
  alignment_length: number
  aligned_reference: string
  aligned_query: string
  score: number
  identity: number
  substitutions: number
  insertions: number
  deletions: number
  difference_count: number
  difference_ratio: number
  differences: RawDifference[]
  algorithm: string
  scoring: ComparisonScoring
  tie_break: string
  coordinate_rule: string
}

interface RawComparisonPage {
  items: RawComparison[]
  total: number
  page: number
  page_size: number
  pages: number
}

interface RawAnalysis {
  id: number
  sequence_name: string
  sequence_length: number
  original_sequence: string
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
  algorithm_version: string
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
  gc_trend: {
    id: number
    name: string
    gc_content: number
    created_at: string
  }[]
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
    name: raw.sequence_name,
    sequence: raw.original_sequence,
    length: raw.sequence_length,
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

export async function createAnalysis(
  input: CreateAnalysisInput
): Promise<AnalysisRecord> {
  const raw = await api.post<RawAnalysis>('/history', {
    sequence_name: input.name,
    original_sequence: input.sequence,
    source: input.source ?? 'manual',
    note: input.note,
  })
  return toRecord(raw)
}

export async function listAnalyses(
  params: {
    q?: string
    page?: number
    pageSize?: number
    includeSequence?: boolean
    dateFrom?: string
    dateTo?: string
  } = {}
): Promise<AnalysisPage> {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  search.set('page', String(params.page ?? 1))
  search.set('page_size', String(params.pageSize ?? 10))
  if (params.includeSequence === false) search.set('include_sequence', 'false')
  if (params.dateFrom) search.set('date_from', params.dateFrom)
  if (params.dateTo) search.set('date_to', params.dateTo)

  const raw = await api.get<RawPage>(`/history?${search.toString()}`)
  return {
    items: raw.items.map(toRecord),
    total: raw.total,
    page: raw.page,
    pageSize: raw.page_size,
    pages: raw.pages,
  }
}

export async function getAnalysis(id: number): Promise<AnalysisRecord> {
  return toRecord(await api.get<RawAnalysis>(`/history/${id}`))
}

export async function deleteAnalysis(id: number): Promise<void> {
  await api.delete(`/history/${id}`)
}

export async function downloadAnalysisReport(id: number): Promise<Blob> {
  return api.download(`/history/${id}/report`)
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
    `/history/${id}/gc-windows?window=${window}&step=${step}`
  )
}

export interface CompareInput {
  reference: string
  query: string
  referenceName?: string
  queryName?: string
}

function toComparisonResult(raw: RawComparison): ComparisonResult {
  return {
    referenceName: raw.reference_name,
    queryName: raw.query_name,
    referenceSequence: raw.reference_sequence,
    querySequence: raw.query_sequence,
    referenceLength: raw.reference_length,
    queryLength: raw.query_length,
    alignmentLength: raw.alignment_length,
    alignedReference: raw.aligned_reference,
    alignedQuery: raw.aligned_query,
    score: raw.score,
    identity: raw.identity,
    substitutions: raw.substitutions,
    insertions: raw.insertions,
    deletions: raw.deletions,
    differenceCount: raw.difference_count,
    differenceRatio: raw.difference_ratio,
    differences: raw.differences.map((item) => ({
      type: item.type,
      refPosition: item.ref_position,
      queryPosition: item.query_position,
      refBase: item.ref_base,
      queryBase: item.query_base,
    })),
    algorithm: raw.algorithm,
    scoring: raw.scoring,
    tieBreak: raw.tie_break,
    coordinateRule: raw.coordinate_rule,
  }
}

function toComparisonRecord(raw: RawComparison): ComparisonRecord {
  return {
    ...toComparisonResult(raw),
    id: raw.id ?? 0,
    name: raw.name ?? '',
    createdAt: raw.created_at ?? '',
  }
}

function comparePayload(input: CompareInput) {
  return {
    reference: input.reference,
    query: input.query,
    reference_name: input.referenceName,
    query_name: input.queryName,
  }
}

export async function compareSequences(
  input: CompareInput
): Promise<ComparisonResult> {
  const raw = await api.post<RawComparison>('/compare', comparePayload(input))
  return toComparisonResult(raw)
}

export async function saveComparison(
  input: CompareInput
): Promise<ComparisonRecord> {
  const raw = await api.post<RawComparison>(
    '/comparisons',
    comparePayload(input)
  )
  return toComparisonRecord(raw)
}

export async function listComparisons(
  params: {
    q?: string
    page?: number
    pageSize?: number
    dateFrom?: string
    dateTo?: string
  } = {}
): Promise<ComparisonPage> {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  search.set('page', String(params.page ?? 1))
  search.set('page_size', String(params.pageSize ?? 10))
  if (params.dateFrom) search.set('date_from', params.dateFrom)
  if (params.dateTo) search.set('date_to', params.dateTo)

  const raw = await api.get<RawComparisonPage>(
    `/comparisons?${search.toString()}`
  )
  return {
    items: raw.items.map(toComparisonRecord),
    total: raw.total,
    page: raw.page,
    pageSize: raw.page_size,
    pages: raw.pages,
  }
}

export async function deleteComparison(id: number): Promise<void> {
  await api.delete(`/comparisons/${id}`)
}

export async function getComparison(id: number): Promise<ComparisonRecord> {
  const raw = await api.get<RawComparison>(`/comparisons/${id}`)
  return toComparisonRecord(raw)
}
