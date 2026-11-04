import { useMemo } from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import { BASE_COLORS, BASE_NAMES, chartTheme } from '@/lib/chart-theme'
import { formatNumber, type BaseCounts } from '@/lib/dna'
import { useTheme } from '@/context/theme-provider'
import { EChart } from '@/components/geneai/echart'

type BaseCountBarProps = {
  counts: BaseCounts
  height?: number
}

export function BaseCountBar({ counts, height = 260 }: BaseCountBarProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const option = useMemo<EChartsCoreOption>(() => {
    const theme = chartTheme(isDark)
    const bases = [
      { key: 'a', label: 'A', value: counts.a },
      { key: 't', label: 'T', value: counts.t },
      { key: 'g', label: 'G', value: counts.g },
      { key: 'c', label: 'C', value: counts.c },
      { key: 'n', label: 'N', value: counts.n },
    ].filter((base) => base.key !== 'n' || counts.n > 0)

    return {
      color: bases.map(
        (base) => BASE_COLORS[base.key as keyof typeof BASE_COLORS]
      ),
      grid: { left: 4, right: 8, top: 30, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'item',
        backgroundColor: theme.tooltipBackground,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
        formatter: (params: unknown) => {
          const item = params as { name: string; value: number }
          const key = item.name.toLowerCase() as keyof typeof BASE_NAMES
          return `${BASE_NAMES[key]}<br/><b>${formatNumber(item.value)}</b> bp`
        },
      },
      legend: { show: false },
      xAxis: {
        type: 'category',
        data: bases.map((base) => base.label),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisLabel: { color: theme.text, fontSize: 12 },
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
          barMaxWidth: 48,
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
            value: base.value,
            itemStyle: {
              color: BASE_COLORS[base.key as keyof typeof BASE_COLORS],
              borderRadius: [6, 6, 0, 0],
            },
          })),
        },
      ],
    }
  }, [counts, isDark])

  return (
    <EChart option={option} height={height} ariaLabel='A/T/C/G 数量柱状图' />
  )
}
