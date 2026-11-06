import type {
  AnalysisPage,
  AnalysisRecord,
  AnalysisSource,
  BaseCounts,
  ComparisonPage,
  ComparisonRecord,
  ComparisonResult,
  ComparisonScoring,
  CodonResult,
  DnaStrand,
  GcWindowPoint,
  GcWindows,
  MutationAnalysis,
  MutationType,
  ProteinChange,
  SequenceDirection,
  SequenceDifference,
  SequenceMapInput,
  SequenceMapResult,
  StatsOverview,
  TranscriptionResult,
  TranslationResult,
  VariantLocation,
  VariantQueryType,
  VariantRecord,
  VariantSearchResult,
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
    at_content: number
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

export async function downloadAnalysisCsv(id: number): Promise<Blob> {
  return api.download(`/history/${id}/csv`)
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
      atContent: point.at_content,
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

interface RawTranscription {
  sequence: string
  coding_sequence: string
  template_sequence: string
  rna: string
  input_strand: DnaStrand
  input_direction: SequenceDirection
  coding_direction: string
  template_direction: string
  rna_direction: string
  length: number
  note: string
}

interface RawCodon {
  index: number
  rna: string
  amino_acid: string
  three_letter: string
  start: number
  end: number
  is_stop: boolean
  is_start: boolean
  ambiguous: boolean
}

interface RawTranslation {
  coding_sequence: string
  template_sequence: string
  template_direction: string
  rna: string
  frame: number
  protein: string
  three_letters: string[]
  codons: RawCodon[]
  start_codon: string | null
  stop_codon: string | null
  stopped_at: number | null
  ignored_bases: number
  ambiguous_codons: number
  warnings: string[]
}

export interface CentralDogmaInput {
  sequence: string
  strand?: DnaStrand
  inputDirection?: SequenceDirection
  frame?: number
}

export async function transcribeSequence(
  input: CentralDogmaInput
): Promise<TranscriptionResult> {
  const raw = await api.post<RawTranscription>('/transcribe', {
    sequence: input.sequence,
    strand: input.strand ?? 'coding',
    input_direction: input.inputDirection ?? '5to3',
  })
  return {
    sequence: raw.sequence,
    codingSequence: raw.coding_sequence,
    templateSequence: raw.template_sequence,
    rna: raw.rna,
    inputStrand: raw.input_strand,
    inputDirection: raw.input_direction,
    codingDirection: raw.coding_direction,
    templateDirection: raw.template_direction,
    rnaDirection: raw.rna_direction,
    length: raw.length,
    note: raw.note,
  }
}

export async function translateSequence(
  input: CentralDogmaInput
): Promise<TranslationResult> {
  const raw = await api.post<RawTranslation>('/translate', {
    sequence: input.sequence,
    strand: input.strand ?? 'coding',
    input_direction: input.inputDirection ?? '5to3',
    frame: input.frame ?? 1,
  })
  const codons: CodonResult[] = raw.codons.map((codon) => ({
    index: codon.index,
    rna: codon.rna,
    aminoAcid: codon.amino_acid,
    threeLetter: codon.three_letter,
    start: codon.start,
    end: codon.end,
    isStop: codon.is_stop,
    isStart: codon.is_start,
    ambiguous: codon.ambiguous,
  }))
  return {
    codingSequence: raw.coding_sequence,
    templateSequence: raw.template_sequence,
    templateDirection: raw.template_direction,
    rna: raw.rna,
    frame: raw.frame,
    protein: raw.protein,
    threeLetters: raw.three_letters,
    codons,
    startCodon: raw.start_codon,
    stopCodon: raw.stop_codon,
    stoppedAt: raw.stopped_at,
    ignoredBases: raw.ignored_bases,
    ambiguousCodons: raw.ambiguous_codons,
    warnings: raw.warnings,
  }
}

interface RawMutationApplied {
  type: MutationType
  position: number
  ref: string
  alt: string
  deleted_sequence: string
  inserted_sequence: string
  length_delta: number
  coordinate_rule: string
}

interface RawProteinChange {
  type: ProteinChange['type']
  original_start: number
  original_end: number
  mutated_start: number
  mutated_end: number
  original: string
  mutated: string
}

interface RawMutationAnalysis {
  original_sequence: string
  mutated_sequence: string
  mutation: RawMutationApplied
  original_rna: string
  mutated_rna: string
  frame: number
  strand: DnaStrand
  input_direction: SequenceDirection
  original_protein: string
  mutated_protein: string
  protein_changes: RawProteinChange[]
  consequence: MutationAnalysis['consequence']
  label: string
  is_premature_stop: boolean
  original_protein_length: number
  mutated_protein_length: number
  protein_length_delta: number
  length_delta: number
  affected_codon: number | null
  changed_amino_acids: { index: number; original: string; mutated: string }[]
  note: string
}

export interface MutateInput {
  sequence: string
  mutationType: MutationType
  position: number
  alt?: string
  ref?: string
  length?: number | null
  frame?: number
  strand?: DnaStrand
  inputDirection?: SequenceDirection
}

export async function mutateSequence(
  input: MutateInput
): Promise<MutationAnalysis> {
  const raw = await api.post<RawMutationAnalysis>('/mutate', {
    sequence: input.sequence,
    mutation_type: input.mutationType,
    position: input.position,
    alt: input.alt ?? '',
    ref: input.ref ?? '',
    length: input.length ?? null,
    frame: input.frame ?? 1,
    strand: input.strand ?? 'coding',
    input_direction: input.inputDirection ?? '5to3',
  })
  return {
    originalSequence: raw.original_sequence,
    mutatedSequence: raw.mutated_sequence,
    mutation: {
      type: raw.mutation.type,
      position: raw.mutation.position,
      ref: raw.mutation.ref,
      alt: raw.mutation.alt,
      deletedSequence: raw.mutation.deleted_sequence,
      insertedSequence: raw.mutation.inserted_sequence,
      lengthDelta: raw.mutation.length_delta,
      coordinateRule: raw.mutation.coordinate_rule,
    },
    originalRna: raw.original_rna,
    mutatedRna: raw.mutated_rna,
    frame: raw.frame,
    strand: raw.strand,
    inputDirection: raw.input_direction,
    originalProtein: raw.original_protein,
    mutatedProtein: raw.mutated_protein,
    proteinChanges: raw.protein_changes.map((change) => ({
      type: change.type,
      originalStart: change.original_start,
      originalEnd: change.original_end,
      mutatedStart: change.mutated_start,
      mutatedEnd: change.mutated_end,
      original: change.original,
      mutated: change.mutated,
    })),
    consequence: raw.consequence,
    label: raw.label,
    isPrematureStop: raw.is_premature_stop,
    originalProteinLength: raw.original_protein_length,
    mutatedProteinLength: raw.mutated_protein_length,
    proteinLengthDelta: raw.protein_length_delta,
    lengthDelta: raw.length_delta,
    affectedCodon: raw.affected_codon,
    changedAminoAcids: raw.changed_amino_acids,
    note: raw.note,
  }
}

interface RawVariantLocation {
  assembly: string
  chromosome: string
  start: number
  stop: number
  ref: string
  alt: string
  band: string
}

interface RawVariantRecord {
  id: string
  accession: string
  title: string
  gene: string
  genes: string[]
  variant_type: string
  ref_allele: string
  alt_allele: string
  spdi: string
  location: RawVariantLocation | null
  locations: RawVariantLocation[]
  genome_build: string
  transcript: string
  reference_sequence: string
  clinical_significance: string
  significance_class: VariantRecord['significanceClass']
  review_status: string
  review_status_label: string
  last_evaluated: string
  phenotypes: string[]
  source: string
  url: string
  retrieved_at: string
  missing_fields: string[]
}

interface RawVariantSearch {
  query: string
  query_type: VariantQueryType
  source: string
  total: number
  returned: number
  retrieved_at: string
  cached: boolean
  items: RawVariantRecord[]
  warnings: string[]
}

function toVariantLocation(raw: RawVariantLocation): VariantLocation {
  return { ...raw }
}

function toVariantRecord(raw: RawVariantRecord): VariantRecord {
  return {
    id: raw.id,
    accession: raw.accession,
    title: raw.title,
    gene: raw.gene,
    genes: raw.genes,
    variantType: raw.variant_type,
    refAllele: raw.ref_allele,
    altAllele: raw.alt_allele,
    spdi: raw.spdi,
    location: raw.location ? toVariantLocation(raw.location) : null,
    locations: raw.locations.map(toVariantLocation),
    genomeBuild: raw.genome_build,
    transcript: raw.transcript,
    referenceSequence: raw.reference_sequence,
    clinicalSignificance: raw.clinical_significance,
    significanceClass: raw.significance_class,
    reviewStatus: raw.review_status,
    reviewStatusLabel: raw.review_status_label,
    lastEvaluated: raw.last_evaluated,
    phenotypes: raw.phenotypes,
    source: raw.source,
    url: raw.url,
    retrievedAt: raw.retrieved_at,
    missingFields: raw.missing_fields,
  }
}

export async function searchVariants(params: {
  q: string
  type?: VariantQueryType
  limit?: number
}): Promise<VariantSearchResult> {
  const search = new URLSearchParams({
    q: params.q,
    query_type: params.type ?? 'auto',
    limit: String(params.limit ?? 10),
  })
  const raw = await api.get<RawVariantSearch>(`/variants/search?${search}`)
  return {
    query: raw.query,
    queryType: raw.query_type,
    source: raw.source,
    total: raw.total,
    returned: raw.returned,
    retrievedAt: raw.retrieved_at,
    cached: raw.cached,
    items: raw.items.map(toVariantRecord),
    warnings: raw.warnings,
  }
}

export async function getVariant(id: string): Promise<VariantRecord> {
  const raw = await api.get<{ item: RawVariantRecord }>(`/variants/${id}`)
  return toVariantRecord(raw.item)
}

interface RawMapGc {
  window: number
  step: number
  points: GcWindowPoint[]
  strategy: string
}

interface RawMapOrf {
  strand: '+' | '-'
  frame: number
  start: number
  end: number
  length_nt: number
  length_aa: number
  start_codon: string
  stop_codon: string | null
  protein: string
  is_complete: boolean
  is_potential: boolean
}

interface RawRestrictionSite {
  enzyme: string
  recognition_site: string
  cut_position: number
  strand: '+' | '-'
}

interface RawMotifSite {
  pattern: string
  start: number
  end: number
  strand: '+' | '-'
}

interface RawMapMutation {
  position: number
  type: MutationType
  ref: string
  alt: string
  length_delta: number
  original_sequence: string
  mutated_sequence: string
  consequence: MutationAnalysis['consequence']
  label: string
  affected_codon: number | null
  original_protein: string
  mutated_protein: string
  is_premature_stop: boolean
  protein_changes: RawProteinChange[]
  note: string
}

interface RawSequenceMap {
  sequence: string
  sequence_length: number
  gc: RawMapGc
  orfs: RawMapOrf[]
  orf_total: number
  restriction_sites: RawRestrictionSite[]
  motifs: RawMotifSite[]
  mutation: RawMapMutation | null
  warnings: string[]
  coordinate_rule: string
}

export async function buildSequenceMap(
  input: SequenceMapInput
): Promise<SequenceMapResult> {
  const raw = await api.post<RawSequenceMap>('/map', {
    sequence: input.sequence,
    window: input.window,
    step: input.step,
    min_orf_aa: input.minOrfAa,
    enzymes: input.enzymes,
    motifs: input.motifs,
    mutation: input.mutation
      ? {
          mutation_type: input.mutation.mutationType,
          position: input.mutation.position,
          alt: input.mutation.alt ?? '',
          ref: input.mutation.ref ?? '',
          length: input.mutation.length,
          frame: input.mutation.frame,
        }
      : null,
  })
  return {
    sequence: raw.sequence,
    sequenceLength: raw.sequence_length,
    gc: {
      window: raw.gc.window,
      step: raw.gc.step,
      points: raw.gc.points,
      strategy: raw.gc.strategy,
    },
    orfs: raw.orfs.map((orf) => ({
      strand: orf.strand,
      frame: orf.frame,
      start: orf.start,
      end: orf.end,
      lengthNt: orf.length_nt,
      lengthAa: orf.length_aa,
      startCodon: orf.start_codon,
      stopCodon: orf.stop_codon,
      protein: orf.protein,
      isComplete: orf.is_complete,
      isPotential: orf.is_potential,
    })),
    orfTotal: raw.orf_total,
    restrictionSites: raw.restriction_sites.map((site) => ({
      enzyme: site.enzyme,
      recognitionSite: site.recognition_site,
      cutPosition: site.cut_position,
      strand: site.strand,
    })),
    motifs: raw.motifs.map((motif) => ({
      pattern: motif.pattern,
      start: motif.start,
      end: motif.end,
      strand: motif.strand,
    })),
    mutation: raw.mutation
      ? {
          position: raw.mutation.position,
          type: raw.mutation.type,
          ref: raw.mutation.ref,
          alt: raw.mutation.alt,
          lengthDelta: raw.mutation.length_delta,
          originalSequence: raw.mutation.original_sequence,
          mutatedSequence: raw.mutation.mutated_sequence,
          consequence: raw.mutation.consequence,
          label: raw.mutation.label,
          affectedCodon: raw.mutation.affected_codon,
          originalProtein: raw.mutation.original_protein,
          mutatedProtein: raw.mutation.mutated_protein,
          isPrematureStop: raw.mutation.is_premature_stop,
          proteinChanges: raw.mutation.protein_changes.map((change) => ({
            type: change.type,
            originalStart: change.original_start,
            originalEnd: change.original_end,
            mutatedStart: change.mutated_start,
            mutatedEnd: change.mutated_end,
            original: change.original,
            mutated: change.mutated,
          })),
          note: raw.mutation.note,
        }
      : null,
    warnings: raw.warnings,
    coordinateRule: raw.coordinate_rule,
  }
}
