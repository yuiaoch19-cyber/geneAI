export type DnaBase = 'A' | 'T' | 'G' | 'C' | 'N'

export type BaseCounts = {
  a: number
  t: number
  g: number
  c: number
  n: number
}

export type SequenceIssue = {
  message: string
  /** 1-based position in the normalized sequence */
  position?: number
}

export type NormalizedSequence = {
  /** Uppercase sequence with whitespace, digits, dashes and FASTA headers removed */
  sequence: string
  /** Name taken from the first FASTA header, when present */
  name?: string
  issue?: SequenceIssue
}

export type SequenceAnalysis = {
  sequence: string
  name?: string
  length: number
  counts: BaseCounts
  /** GC percentage over A/T/G/C, 0 when there are no canonical bases */
  gcContent: number
  atContent: number
  complement: string
  reverseComplement: string
  rna: string
  issue?: SequenceIssue
}

const BASE_COMPLEMENT: Record<DnaBase, DnaBase> = {
  A: 'T',
  T: 'A',
  G: 'C',
  C: 'G',
  N: 'N',
}

/**
 * Normalize raw user input into a plain DNA string.
 *
 * Rules (must stay in sync with `server/app/services/sequence.py`):
 * 1. Drop `>` header lines, whitespace, digits and dashes.
 * 2. Uppercase.
 * 3. Only A/T/G/C/N are accepted; `U` gets a dedicated hint.
 */
export function normalizeSequence(raw: string): NormalizedSequence {
  const lines = raw.split(/\r?\n/)
  let name: string | undefined
  const chunks: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('>')) {
      name ??= trimmed.slice(1).trim() || undefined
      continue
    }
    chunks.push(trimmed)
  }

  const sequence = chunks
    .join('')
    .replace(/[\s\d-]/g, '')
    .toUpperCase()

  if (!sequence) {
    return { sequence, name, issue: { message: '请输入 DNA 序列。' } }
  }

  for (let index = 0; index < sequence.length; index += 1) {
    const base = sequence[index]
    if (base === 'U') {
      return {
        sequence,
        name,
        issue: {
          message: `第 ${index + 1} 位检测到 U（尿嘧啶）。本工具分析 DNA 序列，请先将 RNA 逆转录为 DNA。`,
          position: index + 1,
        },
      }
    }
    if (!(base in BASE_COMPLEMENT)) {
      return {
        sequence,
        name,
        issue: {
          message: `第 ${index + 1} 位出现非法字符 “${base}”，仅支持 A / T / G / C / N。`,
          position: index + 1,
        },
      }
    }
  }

  return { sequence, name }
}

export function countBases(sequence: string): BaseCounts {
  const counts: BaseCounts = { a: 0, t: 0, g: 0, c: 0, n: 0 }
  for (const char of sequence) {
    switch (char) {
      case 'A':
        counts.a += 1
        break
      case 'T':
        counts.t += 1
        break
      case 'G':
        counts.g += 1
        break
      case 'C':
        counts.c += 1
        break
      case 'N':
        counts.n += 1
        break
      default:
        break
    }
  }
  return counts
}

/** GC percentage over canonical bases. Returns 0 for all-N sequences. */
export function gcContent(counts: BaseCounts): number {
  const canonical = counts.a + counts.t + counts.g + counts.c
  if (canonical === 0) return 0
  return ((counts.g + counts.c) / canonical) * 100
}

export function atContent(counts: BaseCounts): number {
  const canonical = counts.a + counts.t + counts.g + counts.c
  if (canonical === 0) return 0
  return ((counts.a + counts.t) / canonical) * 100
}

export function complement(sequence: string): string {
  let result = ''
  for (const char of sequence) {
    result += BASE_COMPLEMENT[char as DnaBase] ?? char
  }
  return result
}

export function reverseComplement(sequence: string): string {
  return complement(sequence).split('').reverse().join('')
}

export function transcribe(sequence: string): string {
  return sequence.replace(/T/g, 'U')
}

/**
 * Local preview used by the input panel. The backend remains the source of
 * truth once the API is wired; both implementations share the same rules.
 */
export function analyzeSequence(raw: string): SequenceAnalysis {
  const { sequence, name, issue } = normalizeSequence(raw)
  const counts = countBases(sequence)

  return {
    sequence,
    name,
    issue,
    length: sequence.length,
    counts,
    gcContent: gcContent(counts),
    atContent: atContent(counts),
    complement: issue ? '' : complement(sequence),
    reverseComplement: issue ? '' : reverseComplement(sequence),
    rna: issue ? '' : transcribe(sequence),
  }
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value)
}
