import { useMemo } from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import { BASE_COLORS, chartTheme } from '@/lib/chart-theme'
import { formatPercent } from '@/lib/dna'
import { useTheme } from '@/context/theme-provider'
import { EChart } from '@/components/geneai/echart'

type GcAtBarProps = {
  gc: number
  at: number
  height?: number
}

/**
 * GC / AT 的 100% 堆叠条。两者分母都是 A+T+G+C，和恒为 100%；
 * 这里用单条横向堆叠同时表达“比例”和“互补关系”。
 */
export function GcAtBar({ gc, at, height = 260 }: GcAtBarProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const option = useMemo<EChartsCoreOption>(() => {
    const theme = chartTheme(isDark)

    return {
      grid: { left: 8, right: 24, top: 44, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'item',
        backgroundColor: theme.tooltipBackground,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
        formatter: (params: unknown) => {
          const item = params as { seriesName: string; value: number }
          return `${item.seriesName}<br/><b>${formatPercent(item.value)}</b>`
        },
      },
      legend: {
        top: 4,
        left: 'center',
        icon: 'roundRect',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 20,
        textStyle: { color: theme.text, fontSize: 12 },
      },
      xAxis: {
        type: 'value',
        max: 100,
        min: 0,
        axisLabel: {
          color: theme.text,
          fontSize: 10,
          formatter: '{value}%',
        },
        splitLine: { lineStyle: { color: theme.splitLine, type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: ['碱基组成'],
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { show: false },
      },
      series: [
        {
          name: 'GC 含量',
          type: 'bar',
          stack: 'ratio',
          barWidth: 42,
          label: {
            show: gc >= 8,
            position: 'inside',
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 600,
            formatter: () => formatPercent(gc),
          },
          itemStyle: { color: BASE_COLORS.a },
          emphasis: { focus: 'series' },
          data: [gc],
        },
        {
          name: 'AT 含量',
          type: 'bar',
          stack: 'ratio',
          barWidth: 42,
          label: {
            show: at >= 8,
            position: 'inside',
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 600,
            formatter: () => formatPercent(at),
          },
          itemStyle: { color: BASE_COLORS.t },
          emphasis: { focus: 'series' },
          data: [at],
        },
      ],
    }
  }, [gc, at, isDark])

  return (
    <EChart option={option} height={height} ariaLabel='GC 与 AT 含量对比图' />
  )
}
