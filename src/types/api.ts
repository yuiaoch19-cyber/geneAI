export type AnalysisSource = 'manual' | 'fasta' | 'demo'

export interface BaseCounts {
  a: number
  t: number
  g: number
  c: number
  n: number
}

export interface AnalysisRecord {
  id: number
  name: string
  sequence: string
  length: number
  counts: BaseCounts
  gcContent: number
  atContent: number
  complement: string
  reverseComplement: string
  rna: string
  source: AnalysisSource
  note: string | null
  createdAt: string
}

export interface AnalysisPage {
  items: AnalysisRecord[]
  total: number
  page: number
  pageSize: number
  pages: number
}

export interface GcTrendPoint {
  id: number
  name: string
  gcContent: number
  createdAt: string
}

export interface RecentRecord {
  id: number
  name: string
  length: number
  gcContent: number
  createdAt: string
}

export interface StatsOverview {
  totalAnalyses: number
  totalSequences: number
  averageGc: number | null
  lastAnalyzedAt: string | null
  baseCounts: BaseCounts
  gcTrend: GcTrendPoint[]
  recent: RecentRecord[]
}

export interface GcWindowPoint {
  start: number
  end: number
  gc: number
}

export interface GcWindows {
  window: number
  step: number
  points: GcWindowPoint[]
}
