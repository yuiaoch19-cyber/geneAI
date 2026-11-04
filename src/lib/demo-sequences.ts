/**
 * Demo data used to showcase the interface.
 *
 * The HBB fragment is a real human beta-globin coding sequence (start of the
 * CDS). Comparison fixtures are derived from it programmatically so the two
 * sequences stay in sync. Anything rendered from these values must be labelled
 * as 演示数据 in the UI and must never be written to the history database.
 */
const HBB_FRAGMENT =
  'ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAG'

export const DEMO_ANALYSIS = {
  label: 'HBB 基因片段',
  description: '人类 β-珠蛋白基因 CDS 起始片段（95 bp，真实序列）',
  sequence: HBB_FRAGMENT,
}

export const DEMO_COMPARISON = {
  label: 'HBB 片段 vs 突变版本',
  description: '由同一片段构造：1 处替换 + 1 处插入（演示数据）',
  reference: HBB_FRAGMENT,
  query: `${HBB_FRAGMENT.slice(0, 20)}G${HBB_FRAGMENT.slice(21, 50)}TT${HBB_FRAGMENT.slice(50)}`,
}
