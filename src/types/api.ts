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

export type MutationType = 'substitution' | 'insertion' | 'deletion'
export type Consequence =
  | 'synonymous'
  | 'missense'
  | 'nonsense'
  | 'frameshift'
  | 'in-frame indel'
  | 'stop_lost'
  | 'no_protein'

export interface MutationApplied {
  type: MutationType
  position: number
  ref: string
  alt: string
  deletedSequence: string
  insertedSequence: string
  lengthDelta: number
  coordinateRule: string
}

export interface ProteinChange {
  type: 'equal' | 'substitution' | 'insertion' | 'deletion'
  originalStart: number
  originalEnd: number
  mutatedStart: number
  mutatedEnd: number
  original: string
  mutated: string
}

export interface AminoAcidChange {
  index: number
  original: string
  mutated: string
}

export interface MutationAnalysis {
  originalSequence: string
  mutatedSequence: string
  mutation: MutationApplied
  originalRna: string
  mutatedRna: string
  frame: number
  strand: DnaStrand
  inputDirection: SequenceDirection
  originalProtein: string
  mutatedProtein: string
  proteinChanges: ProteinChange[]
  consequence: Consequence
  label: string
  isPrematureStop: boolean
  originalProteinLength: number
  mutatedProteinLength: number
  proteinLengthDelta: number
  lengthDelta: number
  affectedCodon: number | null
  changedAminoAcids: AminoAcidChange[]
  note: string
}

export type VariantQueryType = 'auto' | 'gene' | 'variant' | 'id'

export type SignificanceClass =
  | 'pathogenic'
  | 'likely_pathogenic'
  | 'vus'
  | 'likely_benign'
  | 'benign'
  | 'conflicting'
  | 'drug_response'
  | 'risk_factor'
  | 'other'
  | 'unknown'

export type VariantLocation = {
  assembly: string
  chromosome: string
  start: number
  stop: number
  ref: string
  alt: string
  band: string
}

export type VariantRecord = {
  id: string
  accession: string
  title: string
  gene: string
  genes: string[]
  variantType: string
  refAllele: string
  altAllele: string
  spdi: string
  location: VariantLocation | null
  locations: VariantLocation[]
  genomeBuild: string
  transcript: string
  referenceSequence: string
  clinicalSignificance: string
  significanceClass: SignificanceClass
  reviewStatus: string
  reviewStatusLabel: string
  lastEvaluated: string
  phenotypes: string[]
  source: string
  url: string
  retrievedAt: string
  missingFields: string[]
}

export type VariantSearchResult = {
  query: string
  queryType: VariantQueryType
  source: string
  total: number
  returned: number
  retrievedAt: string
  cached: boolean
  items: VariantRecord[]
  warnings: string[]
}

export type MapStrand = '+' | '-'

export interface MapGc {
  window: number
  step: number
  points: GcWindowPoint[]
  strategy: string
}

export interface MapOrf {
  strand: MapStrand
  frame: number
  start: number
  end: number
  lengthNt: number
  lengthAa: number
  startCodon: string
  stopCodon: string | null
  protein: string
  isComplete: boolean
  isPotential: boolean
}

export interface RestrictionSite {
  enzyme: string
  recognitionSite: string
  cutPosition: number
  strand: MapStrand
}

export interface MotifSite {
  pattern: string
  start: number
  end: number
  strand: MapStrand
}

export interface MapMutation {
  position: number
  type: MutationType
  ref: string
  alt: string
  lengthDelta: number
  originalSequence: string
  mutatedSequence: string
  consequence: string
  label: string
  affectedCodon: number | null
  originalProtein: string
  mutatedProtein: string
  isPrematureStop: boolean
  proteinChanges: ProteinChange[]
  note: string
}

export interface SequenceMapResult {
  sequence: string
  sequenceLength: number
  gc: MapGc
  orfs: MapOrf[]
  orfTotal: number
  restrictionSites: RestrictionSite[]
  motifs: MotifSite[]
  mutation: MapMutation | null
  warnings: string[]
  coordinateRule: string
}

export interface SequenceMapInput {
  sequence: string
  window?: number
  step?: number
  minOrfAa?: number
  enzymes?: string[]
  motifs?: string[]
  mutation?: {
    mutationType: MutationType
    position: number
    alt?: string
    ref?: string
    length?: number
    frame?: number
  } | null
}
