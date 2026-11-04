import { useMemo } from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import { BASE_COLORS, BASE_NAMES, chartTheme } from '@/lib/chart-theme'
import { formatNumber, type BaseCounts } from '@/lib/dna'
import { useTheme } from '@/context/theme-provider'
import { EChart } from '@/components/geneai/echart'

type BaseRatioDonutProps = {
  counts: BaseCounts
  height?: number
}

/**
 * A/T/C/G 占比环形图。N 不进入图表，页面会在图下单独说明 N 的数量，
 * 避免把未知碱基稀释进四种碱基的百分比。
 */
export function BaseRatioDonut({ counts, height = 260 }: BaseRatioDonutProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const option = useMemo<EChartsCoreOption>(() => {
    const theme = chartTheme(isDark)
    const total = counts.a + counts.t + counts.g + counts.c
    const data = [
      { key: 'a', name: 'A', value: counts.a },
      { key: 't', name: 'T', value: counts.t },
      { key: 'g', name: 'G', value: counts.g },
      { key: 'c', name: 'C', value: counts.c },
    ].filter((item) => item.value > 0)

    return {
      color: data.map(
        (item) => BASE_COLORS[item.key as keyof typeof BASE_COLORS]
      ),
      title: {
        text: formatNumber(total),
        subtext: 'A / T / G / C 总数',
        left: 'center',
        top: '35%',
        textStyle: {
          color: theme.strongText,
          fontSize: 22,
          fontWeight: 600,
        },
        subtextStyle: { color: theme.text, fontSize: 11 },
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: theme.tooltipBackground,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
        formatter: (params: unknown) => {
          const item = params as {
            name: string
            value: number
            percent: number
          }
          const key = item.name.toLowerCase() as keyof typeof BASE_NAMES
          return `${BASE_NAMES[key]}<br/><b>${formatNumber(item.value)}</b> bp · ${item.percent}%`
        },
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 18,
        textStyle: { color: theme.text, fontSize: 11 },
      },
      series: [
        {
          type: 'pie',
          center: ['50%', '42%'],
          radius: ['56%', '76%'],
          avoidLabelOverlap: true,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: {
            borderColor: isDark ? '#0b1220' : '#ffffff',
            borderWidth: 2,
          },
          emphasis: { scale: true, scaleSize: 4 },
          data: data.map((item) => ({ name: item.name, value: item.value })),
        },
      ],
    }
  }, [counts, isDark])

  return (
    <EChart option={option} height={height} ariaLabel='A/T/C/G 占比环形图' />
  )
}
