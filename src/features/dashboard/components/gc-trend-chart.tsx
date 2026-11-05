import { useMemo } from 'react'
import type { GcTrendPoint } from '@/types/api'
import type { EChartsCoreOption } from 'echarts/core'
import { chartTheme, formatAxisTime } from '@/lib/chart-theme'
import { useTheme } from '@/context/theme-provider'
import { EChart } from '@/components/geneai/echart'

type GcTrendChartProps = {
  points: GcTrendPoint[]
  height?: number
}

export function GcTrendChart({ points, height = 260 }: GcTrendChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const option = useMemo<EChartsCoreOption>(() => {
    const theme = chartTheme(isDark)
    const labels = points.map((point, index) => {
      const name = point.name?.trim()
      if (!name) return `#${index + 1}`
      return name.length > 8 ? `${name.slice(0, 8)}…` : name
    })
    const axisLabels = labels
    return {
      grid: { left: 4, right: 12, top: 28, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: theme.tooltipBackground,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
        formatter: (params: unknown) => {
          const items = params as {
            dataIndex: number
            axisValue: string
            data: { value: number; name: string }
          }[]
          if (!items.length) return ''
          const point = points[items[0].dataIndex]
          return [
            `<span style="color:${theme.text}">${formatAxisTime(point.createdAt, true)}</span>`,
            `<b>${point.gcContent.toFixed(1)}%</b> GC`,
            `<span style="color:${theme.text}">${point.name}</span>`,
          ].join('<br/>')
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: axisLabels,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisLabel: {
          color: theme.text,
          fontSize: 10,
          hideOverlap: true,
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        splitNumber: 4,
        axisLabel: {
          color: theme.text,
          fontSize: 10,
          formatter: '{value}%',
        },
        splitLine: { lineStyle: { color: theme.splitLine, type: 'dashed' } },
      },
      series: [
        {
          type: 'line',
          smooth: 0.25,
          symbol: 'circle',
          symbolSize: points.length === 1 ? 9 : 6,
          showSymbol: points.length <= 24,
          label: {
            show: points.length <= 2,
            position: 'top',
            distance: 6,
            color: theme.text,
            fontSize: 11,
            formatter: (params: { value: number | string }) =>
              `${Number(params.value).toFixed(1)}%`,
          },
          lineStyle: { width: 2, color: '#12998c' },
          itemStyle: {
            color: '#12998c',
            borderWidth: 2,
            borderColor: isDark ? '#0b1220' : '#fff',
          },
          areaStyle: { color: 'rgba(18, 153, 140, 0.08)' },
          data: points.map((point) => ({
            value: point.gcContent,
            name: point.name,
          })),
        },
      ],
    }
  }, [points, isDark])

  return (
    <EChart option={option} height={height} ariaLabel='GC 含量趋势折线图' />
  )
}
