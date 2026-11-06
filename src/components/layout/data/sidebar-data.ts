import {
  ChartSpline,
  Database,
  Dna,
  FlaskConical,
  GitCompareArrows,
  History,
  LayoutDashboard,
  Map,
  Settings,
  Workflow,
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
          title: '转录与翻译',
          url: '/transcription',
          icon: Workflow,
        },
        {
          title: '突变模拟',
          url: '/mutation',
          icon: FlaskConical,
        },
        {
          title: 'DNA 序列地图',
          url: '/map',
          icon: Map,
        },
        {
          title: '变异数据库',
          url: '/variants',
          icon: Database,
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
