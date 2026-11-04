import { useMemo } from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import { BASE_COLORS, chartTheme } from '@/lib/chart-theme'
import { formatNumber, type BaseCounts } from '@/lib/dna'
import { useTheme } from '@/context/theme-provider'
import { EChart } from '@/components/geneai/echart'

type BaseBarProps = {
  counts: BaseCounts
  height?: number
}

const bases = [
  { key: 'a', label: 'A' },
  { key: 't', label: 'T' },
  { key: 'g', label: 'G' },
  { key: 'c', label: 'C' },
  { key: 'n', label: 'N' },
] as const

export function BaseBar({ counts, height = 260 }: BaseBarProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const option = useMemo<EChartsCoreOption>(() => {
    const theme = chartTheme(isDark)
    return {
      grid: { left: 4, right: 8, top: 28, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'item',
        backgroundColor: theme.tooltipBackground,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
        formatter: (params: unknown) => {
          const item = params as { name: string; value: number }
          return `${item.name}<br/><b>${formatNumber(item.value)}</b> bp`
        },
      },
      xAxis: {
        type: 'category',
        data: bases.map((base) => base.label),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisLabel: { color: theme.text, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        splitNumber: 4,
        axisLabel: {
          color: theme.text,
          fontSize: 10,
          formatter: (value: number) => formatNumber(value),
        },
        splitLine: { lineStyle: { color: theme.splitLine, type: 'dashed' } },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: 44,
          label: {
            show: true,
            position: 'top',
            color: theme.strongText,
            fontSize: 11,
            formatter: (params: unknown) => {
              const item = params as { value: number }
              return item.value > 0 ? formatNumber(item.value) : ''
            },
          },
          data: bases.map((base) => ({
            value: counts[base.key],
            itemStyle: {
              color: BASE_COLORS[base.key],
              borderRadius: [6, 6, 0, 0],
            },
          })),
        },
      ],
    }
  }, [counts, isDark])

  return <EChart option={option} height={height} ariaLabel='碱基数量柱状图' />
}
