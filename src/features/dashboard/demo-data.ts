import type { AnalysisRecord, BaseCounts, RecentRecord } from '@/types/api'
import { DEMO_ANALYSIS } from '@/lib/demo-sequences'
import { analyzeSequence } from '@/lib/dna'

/**
 * Dashboard 的演示数据：全部由真实 DNA 片段计算得出，
 * 只在数据库为空且用户主动点击「查看演示」时展示，
 * 每处渲染都必须带「演示数据」标记，绝不写入数据库。
 */

export interface DemoRecord extends RecentRecord {
  sequence: string
  counts: BaseCounts
  complement: string
  reverseComplement: string
  rna: string
  atContent: number
}

function buildRecord(
  name: string,
  sequence: string,
  minutesAgo: number
): DemoRecord {
  const analysis = analyzeSequence(sequence)
  return {
    id: -(minutesAgo + 1),
    name,
    length: analysis.length,
    gcContent: analysis.gcContent,
    createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    sequence: analysis.sequence,
    counts: analysis.counts,
    complement: analysis.complement,
    reverseComplement: analysis.reverseComplement,
    rna: analysis.rna,
    atContent: analysis.atContent,
  }
}

const source = DEMO_ANALYSIS.sequence

export const DEMO_RECORDS: DemoRecord[] = [
  buildRecord('演示 · HBB 基因片段', source, 12),
  buildRecord('演示 · HBB 启动区片段', source.slice(0, 60), 60 * 5),
  buildRecord(
    '演示 · HBB 外显子片段',
    `${source.slice(5)}${source.slice(0, 20)}`,
    60 * 26
  ),
  buildRecord(
    '演示 · 高 GC 对照片段',
    `${source.slice(10, 35)}GCGC${source.slice(35, 80)}`,
    60 * 49
  ),
]

export const DEMO_BASE_COUNTS: BaseCounts = DEMO_RECORDS.reduce<BaseCounts>(
  (total, record) => ({
    a: total.a + record.counts.a,
    t: total.t + record.counts.t,
    g: total.g + record.counts.g,
    c: total.c + record.counts.c,
    n: total.n + record.counts.n,
  }),
  { a: 0, t: 0, g: 0, c: 0, n: 0 }
)

export const DEMO_AVERAGE_GC =
  DEMO_RECORDS.reduce((total, record) => total + record.gcContent, 0) /
  DEMO_RECORDS.length

export const DEMO_LAST_ANALYZED_AT = DEMO_RECORDS[0].createdAt

export const DEMO_TREND = [...DEMO_RECORDS].reverse().map((record) => ({
  id: record.id,
  name: record.name,
  gcContent: record.gcContent,
  atContent: record.atContent,
  createdAt: record.createdAt,
}))

export function toAnalysisRecord(record: DemoRecord): AnalysisRecord {
  return {
    id: record.id,
    name: record.name,
    sequence: record.sequence,
    length: record.length,
    counts: record.counts,
    gcContent: record.gcContent,
    atContent: record.atContent,
    complement: record.complement,
    reverseComplement: record.reverseComplement,
    rna: record.rna,
    source: 'demo',
    note: '演示数据，不会写入历史记录。',
    createdAt: record.createdAt,
  }
}
