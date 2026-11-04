import { useMemo } from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import { chartTheme } from '@/lib/chart-theme'
import { formatNumber } from '@/lib/dna'
import { useTheme } from '@/context/theme-provider'
import { EChart } from '@/components/geneai/echart'

export type LengthSample = {
  id: number
  name: string
  length: number
}

type LengthDistributionProps = {
  samples: LengthSample[]
  height?: number
}

const BUCKETS = [
  { label: '≤ 50', min: 0, max: 50 },
  { label: '51–100', min: 51, max: 100 },
  { label: '101–250', min: 101, max: 250 },
  { label: '251–500', min: 251, max: 500 },
  { label: '501–1k', min: 501, max: 1000 },
  { label: '1k–2.5k', min: 1001, max: 2500 },
  { label: '2.5k–5k', min: 2501, max: 5000 },
  { label: '5k–10k', min: 5001, max: 10000 },
  { label: '> 10k', min: 10001, max: Number.POSITIVE_INFINITY },
] as const

export function LengthDistribution({
  samples,
  height = 300,
}: LengthDistributionProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const option = useMemo<EChartsCoreOption>(() => {
    const theme = chartTheme(isDark)
    const counts = BUCKETS.map(
      (bucket) =>
        samples.filter(
          (sample) => sample.length >= bucket.min && sample.length <= bucket.max
        ).length
    )
    // 截掉尾部空桶，避免很长的空坐标轴；至少保留到第一个有数据的桶。
    const lastIndex = counts.reduce(
      (last, value, index) => (value > 0 ? index : last),
      0
    )
    const visible = BUCKETS.slice(0, Math.max(lastIndex + 1, 4))
    const values = counts.slice(0, visible.length)
    const total = samples.length

    return {
      grid: { left: 8, right: 28, top: 28, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'item',
        backgroundColor: theme.tooltipBackground,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
        formatter: (params: unknown) => {
          const item = params as { name: string; value: number }
          const percent = total > 0 ? (item.value / total) * 100 : 0
          return `${item.name} bp<br/><b>${formatNumber(item.value)}</b> 条 · ${percent.toFixed(1)}%`
        },
      },
      xAxis: {
        type: 'category',
        data: visible.map((bucket) => bucket.label),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisLabel: { color: theme.text, fontSize: 10, interval: 0 },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
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
          barMaxWidth: 46,
          data: values,
          itemStyle: {
            color: '#8760c4',
            borderRadius: [6, 6, 0, 0],
            opacity: 0.9,
          },
          emphasis: { itemStyle: { opacity: 1 } },
          label: {
            show: true,
            position: 'top',
            color: theme.strongText,
            fontSize: 11,
            formatter: (params: unknown) => {
              const item = params as { value: number }
              return item.value > 0 ? String(item.value) : ''
            },
          },
        },
      ],
      animationDuration: 300,
    }
  }, [samples, isDark])

  return (
    <EChart
      option={option}
      height={height}
      ariaLabel='历史序列长度分布柱状图'
    />
  )
}
