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
  description: '人类 β-珠蛋白基因 CDS 起始片段（92 bp，真实序列）',
  sequence: HBB_FRAGMENT,
}

export const TEACHING_SAMPLES = [
  {
    id: 'A',
    label: '示例 A · 正常',
    sequence: 'ATGGAACCTTGGTAA',
    description: 'AUG GAA CCU UGG UAA → Met-Glu-Pro-Trp-Stop',
  },
  {
    id: 'B',
    label: '示例 B · 无义',
    sequence: 'ATGTAACCTTGGTAA',
    description: 'AUG UAA CCU UGG UAA → Met-Stop（第二密码子提前终止）',
  },
  {
    id: 'C',
    label: '示例 C · 移码',
    sequence: 'ATGAGAACCTTGGTAA',
    description: 'ATG 后插入 A，阅读框改变：AUG AGA ACC UUG GUA A',
  },
] as const

export const DEMO_COMPARISON = {
  label: 'HBB 片段 vs 突变版本',
  description:
    '由同一片段构造：第 21 位替换 + 第 50 位后插入 1 个 T（演示数据）',
  reference: HBB_FRAGMENT,
  query: `${HBB_FRAGMENT.slice(0, 20)}A${HBB_FRAGMENT.slice(21, 50)}T${HBB_FRAGMENT.slice(50)}`,
}
