/**
 * ECharts 统一视觉：与 theme.css 的 chart-1..5 语义保持一致。
 * ECharts 的 canvas 渲染对 oklch 支持不稳定，这里使用等值的十六进制色。
 */

export const BASE_COLORS = {
  a: '#12998c',
  t: '#315f9c',
  g: '#d39a3c',
  c: '#8760c4',
  n: '#8b95a5',
} as const

export const BASE_NAMES = {
  a: '腺嘌呤 A',
  t: '胸腺嘧啶 T',
  g: '鸟嘌呤 G',
  c: '胞嘧啶 C',
  n: '未知碱基 N',
} as const

export function chartTheme(isDark: boolean) {
  return {
    text: isDark ? '#94a3b8' : '#64748b',
    strongText: isDark ? '#e2e8f0' : '#1e293b',
    splitLine: isDark
      ? 'rgba(148, 163, 184, 0.16)'
      : 'rgba(100, 116, 139, 0.14)',
    axisLine: isDark
      ? 'rgba(148, 163, 184, 0.28)'
      : 'rgba(100, 116, 139, 0.22)',
    tooltipBackground: isDark ? '#0b1220' : '#ffffff',
    tooltipBorder: isDark
      ? 'rgba(148, 163, 184, 0.28)'
      : 'rgba(100, 116, 139, 0.18)',
    tooltipText: isDark ? '#e2e8f0' : '#1e293b',
  }
}

export function formatAxisTime(iso: string, withSeconds = false): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const pad = (value: number) => String(value).padStart(2, '0')
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}${withSeconds ? `:${pad(date.getSeconds())}` : ''}`
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${time}`
}
