import {
  BarChart3,
  Database,
  Dna,
  Gauge,
  Server,
  ShieldCheck,
} from 'lucide-react'

const items = [
  {
    icon: Database,
    label: '数据存储',
    value: 'SQLite · server/geneai.db',
    hint: '删除该文件会同时清空全部历史记录。',
  },
  {
    icon: Dna,
    label: '序列长度上限',
    value: '100,000 bp',
    hint: '超过 10,000 bp 的序列建议直接查看统计结果，不再渲染完整序列。',
  },
  {
    icon: Gauge,
    label: 'GC 含量口径',
    value: '(G + C) / (A + T + G + C)',
    hint: 'N 不计入分母；纯 N 序列的 GC 含量记为 0。',
  },
  {
    icon: Server,
    label: '后端服务',
    value: 'FastAPI · 127.0.0.1:8000',
    hint: '前端通过 /api 代理访问，保存与历史查询都依赖该服务。',
  },
  {
    icon: BarChart3,
    label: '图表引擎',
    value: 'ECharts 5 · Canvas',
    hint: '图表颜色与碱基语义色一致，可随浅色 / 深色主题切换。',
  },
  {
    icon: ShieldCheck,
    label: '数据边界',
    value: '仅保存在本机',
    hint: '平台不上传序列，也不需要登录；清理浏览器数据不会删除数据库。',
  },
] as const

export function DisplayForm() {
  return (
    <div className='space-y-6'>
      <div className='divide-y rounded-lg border'>
        {items.map((item) => (
          <div key={item.label} className='flex gap-3 p-4'>
            <div className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground'>
              <item.icon className='size-4' />
            </div>
            <div className='min-w-0 space-y-1'>
              <div className='flex flex-wrap items-baseline gap-x-2'>
                <span className='text-sm font-medium'>{item.label}</span>
                <span className='font-mono text-xs text-muted-foreground'>
                  {item.value}
                </span>
              </div>
              <p className='text-xs leading-relaxed text-muted-foreground'>
                {item.hint}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className='text-xs text-muted-foreground'>
        GeneAI v0.3.0 · 课程项目。所有序列分析与统计均在本地完成。
      </p>
    </div>
  )
}
