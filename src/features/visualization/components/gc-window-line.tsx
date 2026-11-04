import { useMemo } from 'react'
import type { GcWindowPoint } from '@/types/api'
import type { EChartsCoreOption } from 'echarts/core'
import { BASE_COLORS, chartTheme } from '@/lib/chart-theme'
import { formatPercent } from '@/lib/dna'
import { useTheme } from '@/context/theme-provider'
import { EChart } from '@/components/geneai/echart'

type GcWindowLineProps = {
  points: GcWindowPoint[]
  window: number
  step: number
  sequenceLength: number
  height?: number
}

export function GcWindowLine({
  points,
  window,
  step,
  sequenceLength,
  height = 300,
}: GcWindowLineProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const average = useMemo(() => {
    if (points.length === 0) return 0
    return points.reduce((sum, point) => sum + point.gc, 0) / points.length
  }, [points])

  const option = useMemo<EChartsCoreOption>(() => {
    const theme = chartTheme(isDark)

    return {
      grid: { left: 8, right: 24, top: 28, bottom: 34, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: theme.tooltipBackground,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
        formatter: (params: unknown) => {
          const list = params as { value: [number, number] }[]
          if (!list?.length) return ''
          const [startOneBased, gc] = list[0].value
          const start = startOneBased - 1
          const end = start + window
          return `窗口 ${start + 1}–${end} bp<br/>GC <b>${formatPercent(gc)}</b>`
        },
      },
      xAxis: {
        type: 'value',
        min: 1,
        max: sequenceLength,
        name: '参考位置 (bp)',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: theme.text, fontSize: 10 },
        axisLabel: { color: theme.text, fontSize: 10 },
        axisLine: { lineStyle: { color: theme.axisLine } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        interval: 25,
        axisLabel: {
          color: theme.text,
          fontSize: 10,
          formatter: '{value}%',
        },
        splitLine: { lineStyle: { color: theme.splitLine, type: 'dashed' } },
      },
      series: [
        {
          name: '滑动窗口 GC',
          type: 'line',
          showSymbol: false,
          sampling: 'lttb',
          lineStyle: { width: 1.6, color: BASE_COLORS.a },
          itemStyle: { color: BASE_COLORS.a },
          areaStyle: { color: BASE_COLORS.a, opacity: 0.1 },
          data: points.map((point) => [point.start + 1, point.gc]),
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: theme.axisLine, type: 'dashed', width: 1 },
            label: {
              color: theme.text,
              fontSize: 10,
              formatter: `平均 ${formatPercent(average)}`,
              position: 'insideEndTop',
            },
            data: [{ yAxis: average }],
          },
        },
      ],
      animationDuration: 300,
    }
  }, [points, window, sequenceLength, isDark, average])

  return (
    <EChart
      option={option}
      height={height}
      ariaLabel={`滑动窗口 GC 曲线，窗口 ${window} bp，步长 ${step} bp`}
    />
  )
}
