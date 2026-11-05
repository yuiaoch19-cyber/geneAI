import { useMemo } from 'react'
import type { GcTrendPoint } from '@/types/api'
import type { EChartsCoreOption } from 'echarts/core'
import { BASE_COLORS, chartTheme, formatAxisTime } from '@/lib/chart-theme'
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
      const name = point.name?.trim().replace(/^演示\s*·\s*/, '')
      if (!name) return `#${index + 1}`
      return name.length > 8 ? `${name.slice(0, 8)}…` : name
    })
    const showLabels = points.length <= 2
    const area = (color: string) => ({
      color: {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: `${color}33` },
          { offset: 1, color: `${color}00` },
        ],
      },
    })
    return {
      grid: { left: 4, right: 16, top: 44, bottom: 4, containLabel: true },
      legend: {
        top: 0,
        right: 0,
        icon: 'roundRect',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 16,
        textStyle: { color: theme.text, fontSize: 11 },
        data: ['GC 含量', 'AT 含量'],
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: theme.tooltipBackground,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
        formatter: (params: unknown) => {
          const items = params as { dataIndex: number }[]
          if (!items.length) return ''
          const point = points[items[0].dataIndex]
          return [
            `<span style="color:${theme.text}">${formatAxisTime(point.createdAt, true)}</span>`,
            `<b>${point.gcContent.toFixed(1)}%</b> GC · <b>${point.atContent.toFixed(1)}%</b> AT`,
            `<span style="color:${theme.text}">${point.name}</span>`,
          ].join('<br/>')
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: labels,
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
          name: 'GC 含量',
          type: 'line',
          smooth: 0.3,
          symbol: 'circle',
          symbolSize: points.length === 1 ? 9 : 6,
          showSymbol: points.length <= 24,
          label: {
            show: showLabels,
            position: 'top',
            distance: 6,
            color: theme.strongText,
            fontSize: 11,
            formatter: (params: { value: number | string }) =>
              `${Number(params.value).toFixed(1)}%`,
          },
          lineStyle: { width: 2.3, color: BASE_COLORS.a },
          itemStyle: {
            color: BASE_COLORS.a,
            borderWidth: 2,
            borderColor: isDark ? '#0b1220' : '#fff',
          },
          areaStyle: area(BASE_COLORS.a),
          data: points.map((point) => ({
            value: point.gcContent,
            name: point.name,
          })),
        },
        {
          name: 'AT 含量',
          type: 'line',
          smooth: 0.3,
          symbol: 'circle',
          symbolSize: points.length === 1 ? 9 : 6,
          showSymbol: points.length <= 24,
          label: {
            show: showLabels,
            position: 'bottom',
            distance: 6,
            color: theme.strongText,
            fontSize: 11,
            formatter: (params: { value: number | string }) =>
              `${Number(params.value).toFixed(1)}%`,
          },
          lineStyle: { width: 2.3, color: BASE_COLORS.t },
          itemStyle: {
            color: BASE_COLORS.t,
            borderWidth: 2,
            borderColor: isDark ? '#0b1220' : '#fff',
          },
          areaStyle: area(BASE_COLORS.t),
          data: points.map((point) => ({
            value: point.atContent,
            name: point.name,
          })),
        },
      ],
    }
  }, [points, isDark])

  return (
    <EChart
      option={option}
      height={height}
      ariaLabel='GC 与 AT 含量趋势折线图'
    />
  )
}
