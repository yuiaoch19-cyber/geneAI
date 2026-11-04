import { describe, expect, it } from 'vitest'
import {
  analyzeSequence,
  atContent,
  complement,
  countBases,
  gcContent,
  gcWindows,
  MAX_SEQUENCE_LENGTH,
  normalizeSequence,
  reverseComplement,
  transcribe,
} from './dna'

describe('normalizeSequence', () => {
  it('keeps a normal uppercase sequence unchanged', () => {
    expect(normalizeSequence('ATGC')).toEqual({
      sequence: 'ATGC',
      name: undefined,
    })
  })

  it('accepts lowercase input and uppercases it', () => {
    const result = normalizeSequence('atgcAtGc')
    expect(result.issue).toBeUndefined()
    expect(result.sequence).toBe('ATGCATGC')
  })

  it('ignores spaces, tabs and line breaks', () => {
    const result = normalizeSequence('AT GC\n\tAT\r\nGC')
    expect(result.issue).toBeUndefined()
    expect(result.sequence).toBe('ATGCATGC')
    expect(result.sequence).toHaveLength(8)
  })

  it('reads a single FASTA header and keeps the header text as the name', () => {
    const result = normalizeSequence('>HBB fragment\nATG CAT\nGCA')
    expect(result.issue).toBeUndefined()
    expect(result.name).toBe('HBB fragment')
    expect(result.sequence).toBe('ATGCATGCA')
  })

  it('rejects an empty sequence', () => {
    const result = normalizeSequence('   \n\n')
    expect(result.issue?.message).toContain('请输入 DNA 序列')
  })

  it('rejects a FASTA header without sequence lines', () => {
    const result = normalizeSequence('>only-header\n\n')
    expect(result.issue?.message).toContain('没有序列行')
  })

  it('rejects multiple FASTA records', () => {
    const result = normalizeSequence('>one\nATGC\n>two\nATGC')
    expect(result.issue?.message).toContain('仅支持单条 FASTA 记录')
  })

  it('reports the 1-based position of an illegal character', () => {
    const result = normalizeSequence('ATXG')
    expect(result.issue?.position).toBe(3)
    expect(result.issue?.message).toContain('第 3 位')
    expect(result.issue?.message).toContain('X')
  })

  it('rejects U with a dedicated DNA/RNA hint', () => {
    const result = normalizeSequence('AUGC')
    expect(result.issue?.message).toContain('尿嘧啶')
    expect(result.issue?.position).toBe(2)
  })

  it('rejects digits instead of silently dropping them', () => {
    const result = normalizeSequence('ATG1C')
    expect(result.issue?.message).toContain('数字')
    expect(result.issue?.position).toBe(4)
  })

  it('rejects alignment gaps', () => {
    const result = normalizeSequence('AT-GC')
    expect(result.issue?.message).toContain('比对缺口')
    expect(result.issue?.position).toBe(3)
  })

  it('rejects ambiguous IUPAC bases other than N', () => {
    const result = normalizeSequence('ATRGC')
    expect(result.issue?.message).toContain('模糊碱基')
    expect(result.issue?.position).toBe(3)
  })

  it('rejects sequences longer than the limit', () => {
    const result = normalizeSequence('A'.repeat(MAX_SEQUENCE_LENGTH + 1))
    expect(result.issue?.message).toContain('上限')
  })
})

describe('base counts and content', () => {
  it('counts A/T/G/C/N separately', () => {
    expect(countBases('ATGCATGC')).toEqual({
      a: 2,
      t: 2,
      g: 2,
      c: 2,
      n: 0,
    })
    expect(countBases('AANN')).toEqual({ a: 2, t: 0, g: 0, c: 0, n: 2 })
  })

  it('computes GC and AT content over canonical bases', () => {
    const counts = countBases('ATGC')
    expect(gcContent(counts)).toBe(50)
    expect(atContent(counts)).toBe(50)
  })

  it('excludes N from the GC/AT denominator', () => {
    const counts = countBases('GGNN')
    expect(gcContent(counts)).toBe(100)
    expect(atContent(counts)).toBe(0)
  })

  it('handles all-A and all-G sequences', () => {
    expect(gcContent(countBases('AAAA'))).toBe(0)
    expect(atContent(countBases('AAAA'))).toBe(100)
    expect(gcContent(countBases('GGGG'))).toBe(100)
    expect(atContent(countBases('GGGG'))).toBe(0)
  })

  it('returns 0% for an all-N sequence', () => {
    const counts = countBases('NNNN')
    expect(gcContent(counts)).toBe(0)
    expect(atContent(counts)).toBe(0)
  })
})

describe('strand conversions', () => {
  it('builds the complement chain with A↔T and G↔C', () => {
    expect(complement('ATGC')).toBe('TACG')
  })

  it('builds the reverse complement', () => {
    expect(reverseComplement('ATGC')).toBe('GCAT')
    expect(reverseComplement('AATT')).toBe('AATT')
  })

  it('keeps N unchanged in both chains', () => {
    expect(complement('ATNG')).toBe('TANC')
    expect(reverseComplement('ATNG')).toBe('CNAT')
  })

  it('transcribes by replacing T with U on the same strand', () => {
    expect(transcribe('ATGC')).toBe('AUGC')
    expect(transcribe('TTAA')).toBe('UUAA')
  })
})

describe('gcWindows', () => {
  it('returns GC percentages for every complete window', () => {
    expect(gcWindows('ATGCATGC', 2, 2)).toEqual([
      { start: 0, end: 2, gc: 0 },
      { start: 2, end: 4, gc: 100 },
      { start: 4, end: 6, gc: 0 },
      { start: 6, end: 8, gc: 100 },
    ])
  })

  it('drops the trailing bases that do not fill a window', () => {
    const points = gcWindows('ATGCATGCA', 4, 4)
    expect(points).toHaveLength(2)
    expect(points[1]).toEqual({ start: 4, end: 8, gc: 50 })
  })

  it('excludes N from the GC denominator but keeps it in the window', () => {
    expect(gcWindows('ATNG', 2, 2)).toEqual([
      { start: 0, end: 2, gc: 0 },
      { start: 2, end: 4, gc: 100 },
    ])
  })

  it('returns no windows for invalid parameters', () => {
    expect(gcWindows('ATGC', 0, 1)).toEqual([])
    expect(gcWindows('ATGC', 2, 0)).toEqual([])
    expect(gcWindows('ATGC', 2.5, 1)).toEqual([])
    expect(gcWindows('ATGC', 5, 1)).toEqual([])
  })
})

describe('analyzeSequence', () => {
  it('returns a complete analysis for a normal sequence', () => {
    const result = analyzeSequence('ATGC')
    expect(result.issue).toBeUndefined()
    expect(result.length).toBe(4)
    expect(result.counts).toEqual({ a: 1, t: 1, g: 1, c: 1, n: 0 })
    expect(result.gcContent).toBe(50)
    expect(result.atContent).toBe(50)
    expect(result.complement).toBe('TACG')
    expect(result.reverseComplement).toBe('GCAT')
    expect(result.rna).toBe('AUGC')
  })

  it('returns empty chains when the input has an issue', () => {
    const result = analyzeSequence('ATXG')
    expect(result.issue).toBeDefined()
    expect(result.complement).toBe('')
    expect(result.reverseComplement).toBe('')
    expect(result.rna).toBe('')
  })

  it('handles FASTA input end to end', () => {
    const result = analyzeSequence('>demo\natg cat\nGC A')
    expect(result.issue).toBeUndefined()
    expect(result.name).toBe('demo')
    expect(result.length).toBe(9)
    expect(result.counts.a).toBe(3)
    expect(result.counts.t).toBe(2)
    expect(result.counts.g).toBe(2)
    expect(result.counts.c).toBe(2)
  })
})
