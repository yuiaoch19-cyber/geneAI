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
  atContent: number
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

export type DifferenceType = 'substitution' | 'insertion' | 'deletion'

export interface SequenceDifference {
  type: DifferenceType
  refPosition: number
  queryPosition: number
  refBase: string | null
  queryBase: string | null
}

export interface ComparisonScoring {
  mode: string
  match_score: number
  mismatch_score: number
  open_gap_score: number
  extend_gap_score: number
}

export interface ComparisonResult {
  referenceName: string
  queryName: string
  referenceSequence: string
  querySequence: string
  referenceLength: number
  queryLength: number
  alignmentLength: number
  alignedReference: string
  alignedQuery: string
  score: number
  identity: number
  substitutions: number
  insertions: number
  deletions: number
  differenceCount: number
  differenceRatio: number
  differences: SequenceDifference[]
  algorithm: string
  scoring: ComparisonScoring
  tieBreak: string
  coordinateRule: string
}

export interface ComparisonRecord extends ComparisonResult {
  id: number
  name: string
  createdAt: string
}

export interface ComparisonPage {
  items: ComparisonRecord[]
  total: number
  page: number
  pageSize: number
  pages: number
}

export type DnaStrand = 'coding' | 'template'
export type SequenceDirection = '5to3' | '3to5'

export interface TranscriptionResult {
  sequence: string
  codingSequence: string
  templateSequence: string
  rna: string
  inputStrand: DnaStrand
  inputDirection: SequenceDirection
  codingDirection: string
  templateDirection: string
  rnaDirection: string
  length: number
  note: string
}

export interface CodonResult {
  index: number
  rna: string
  aminoAcid: string
  threeLetter: string
  start: number
  end: number
  isStop: boolean
  isStart: boolean
  ambiguous: boolean
}

export interface TranslationResult {
  codingSequence: string
  templateSequence: string
  templateDirection: string
  rna: string
  frame: number
  protein: string
  threeLetters: string[]
  codons: CodonResult[]
  startCodon: string | null
  stopCodon: string | null
  stoppedAt: number | null
  ignoredBases: number
  ambiguousCodons: number
  warnings: string[]
}
