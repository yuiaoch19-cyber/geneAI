import {
  ChartSpline,
  Dna,
  GitCompareArrows,
  History,
  LayoutDashboard,
  Settings,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: '本地工作区',
    email: 'SQLite · 本机存储',
    avatar: '',
  },
  teams: [
    {
      name: 'GeneAI',
      logo: Dna,
      plan: 'DNA 序列分析',
    },
  ],
  navGroups: [
    {
      title: '分析工作台',
      items: [
        {
          title: '分析总览',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'DNA 序列分析',
          url: '/analysis',
          icon: Dna,
        },
        {
          title: '序列比对',
          url: '/compare',
          icon: GitCompareArrows,
        },
        {
          title: '数据可视化',
          url: '/visualization',
          icon: ChartSpline,
        },
        {
          title: '历史记录',
          url: '/history',
          icon: History,
        },
      ],
    },
    {
      title: '系统',
      items: [
        {
          title: '系统设置',
          url: '/settings/appearance',
          icon: Settings,
        },
      ],
    },
  ],
}
