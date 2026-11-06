export const BASE_HEX: Record<string, string> = {
  A: '#2563eb',
  T: '#8b5cf6',
  G: '#f59e0b',
  C: '#10b981',
  N: '#94a3b8',
  U: '#f43f5e',
}

export const BASE_NAMES: Record<string, string> = {
  A: '腺嘌呤',
  T: '胸腺嘧啶',
  G: '鸟嘌呤',
  C: '胞嘧啶',
  N: '未知碱基',
  U: '尿嘧啶',
}

export const RNA_COMPLEMENT: Record<string, string> = {
  A: 'U',
  T: 'A',
  G: 'C',
  C: 'G',
  N: 'N',
}

export const AA_NAMES: Record<string, string> = {
  Ala: '丙氨酸',
  Arg: '精氨酸',
  Asn: '天冬酰胺',
  Asp: '天冬氨酸',
  Cys: '半胱氨酸',
  Gln: '谷氨酰胺',
  Glu: '谷氨酸',
  Gly: '甘氨酸',
  His: '组氨酸',
  Ile: '异亮氨酸',
  Leu: '亮氨酸',
  Lys: '赖氨酸',
  Met: '甲硫氨酸',
  Phe: '苯丙氨酸',
  Pro: '脯氨酸',
  Ser: '丝氨酸',
  Thr: '苏氨酸',
  Trp: '色氨酸',
  Tyr: '酪氨酸',
  Val: '缬氨酸',
  Stop: '终止',
  Xaa: '未知氨基酸',
}

export const AA_COLORS = [
  '#2563eb',
  '#8b5cf6',
  '#0d9488',
  '#f59e0b',
  '#ec4899',
  '#0891b2',
  '#65a30d',
  '#7c3aed',
]

export function baseColor(base: string): string {
  return BASE_HEX[base.toUpperCase()] ?? BASE_HEX.N
}

export function anticodonFor(codon: string): string {
  return codon
    .split('')
    .map((base) => RNA_COMPLEMENT[base] ?? 'N')
    .join('')
}
