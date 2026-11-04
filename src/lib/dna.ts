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
  /** Uppercase sequence with whitespace and FASTA headers removed */
  sequence: string
  /** Header text taken from the single FASTA record, when present */
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

/** Kept in sync with `MAX_SEQUENCE_LENGTH` in server/app/config.py. */
export const MAX_SEQUENCE_LENGTH = 100_000

/** FASTA uploads larger than this are rejected before reading the file. */
export const MAX_FASTA_BYTES = 2 * 1024 * 1024

const BASE_COMPLEMENT: Record<DnaBase, DnaBase> = {
  A: 'T',
  T: 'A',
  G: 'C',
  C: 'G',
  N: 'N',
}

const AMBIGUOUS_BASES = 'RYSWKMBDHV'

/**
 * Normalize raw user input into a plain DNA string.
 *
 * Rules (must stay in sync with `server/app/services/dna.py`):
 * 1. A single optional FASTA header (`>name`) is accepted; multiple headers are
 *    rejected instead of silently merging two records.
 * 2. Whitespace and line breaks are ignored; lowercase is uppercased.
 * 3. Digits, gaps, U and ambiguous IUPAC bases are reported as errors rather
 *    than dropped, so a malformed paste cannot silently change the result.
 * 4. Only A/T/G/C/N are accepted. N is counted separately and excluded from
 *    the GC/AT denominator.
 */
export function normalizeSequence(raw: string): NormalizedSequence {
  const lines = raw.split(/\r?\n/)
  let name: string | undefined
  let headerCount = 0
  const chunks: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('>')) {
      headerCount += 1
      if (headerCount > 1) {
        return {
          sequence: '',
          issue: {
            message:
              '仅支持单条 FASTA 记录：检测到多个以 “>” 开头的标题行，请合并为一条后重试。',
          },
        }
      }
      name = trimmed.slice(1).trim() || undefined
      continue
    }
    chunks.push(trimmed)
  }

  const sequence = chunks.join('').replace(/\s+/g, '').toUpperCase()

  if (!sequence) {
    return {
      sequence,
      name,
      issue: {
        message:
          headerCount > 0
            ? 'FASTA 文件中没有序列行：标题行之后需要至少一个碱基。'
            : '请输入 DNA 序列。',
      },
    }
  }

  if (sequence.length > MAX_SEQUENCE_LENGTH) {
    return {
      sequence,
      name,
      issue: {
        message: `序列长度为 ${sequence.length.toLocaleString('en-US')} bp，超过 ${MAX_SEQUENCE_LENGTH.toLocaleString('en-US')} bp 上限。`,
      },
    }
  }

  for (let index = 0; index < sequence.length; index += 1) {
    const base = sequence[index]
    const position = index + 1

    if (base === 'U') {
      return {
        sequence,
        name,
        issue: {
          message: `第 ${position} 位检测到 U（尿嘧啶）。本工具分析 DNA 序列，请先将 RNA 逆转录为 DNA。`,
          position,
        },
      }
    }
    if (base === '-') {
      return {
        sequence,
        name,
        issue: {
          message: `第 ${position} 位出现 “-”（比对缺口）。本工具只分析未比对的原始序列，请先移除缺口字符。`,
          position,
        },
      }
    }
    if (/\d/.test(base)) {
      return {
        sequence,
        name,
        issue: {
          message: `第 ${position} 位出现数字 “${base}”。请删除序列中的编号后再试。`,
          position,
        },
      }
    }
    if (AMBIGUOUS_BASES.includes(base)) {
      return {
        sequence,
        name,
        issue: {
          message: `第 ${position} 位出现模糊碱基 “${base}”。当前仅支持 A / T / G / C / N；N 会单独计数且不参与 GC / AT 计算。`,
          position,
        },
      }
    }
    if (!(base in BASE_COMPLEMENT)) {
      return {
        sequence,
        name,
        issue: {
          message: `第 ${position} 位出现非法字符 “${base}”，仅支持 A / T / G / C / N。`,
          position,
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
 * Local analysis used by the input preview and the analysis page. The backend
 * re-runs the same rules on save and remains the source of truth for storage.
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
