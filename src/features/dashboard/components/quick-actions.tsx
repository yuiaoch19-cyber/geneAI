import { useNavigate } from '@tanstack/react-router'
import { ChevronRight, Dna, History, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'

export function QuickActions() {
  const navigate = useNavigate()

  function openFilePicker() {
    document.getElementById('geneai-quick-fasta')?.click()
  }

  function handleFile(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const content = String(reader.result ?? '')
      if (!content.trim()) {
        toast.error('文件内容为空，请选择有效的 FASTA 文件。')
        return
      }
      sessionStorage.setItem(
        'geneai:pending-fasta',
        JSON.stringify({ name: file.name, content })
      )
      toast.success('FASTA 已载入，正在打开分析页…')
      void navigate({ to: '/analysis' })
    }
    reader.onerror = () => toast.error('文件读取失败，请重试。')
    reader.readAsText(file)
  }

  const items = [
    {
      key: 'analysis',
      icon: Dna,
      title: '新建 DNA 分析',
      description: '输入序列并计算碱基组成、链转换',
      onClick: () => void navigate({ to: '/analysis' }),
    },
    {
      key: 'upload',
      icon: Upload,
      title: '上传 FASTA 文件',
      description: '读取本地 .fasta / .fa 文件并预填',
      onClick: openFilePicker,
    },
    {
      key: 'history',
      icon: History,
      title: '查看历史记录',
      description: '检索已保存的分析与后续 PDF 报告',
      onClick: () => void navigate({ to: '/history' }),
    },
  ] as const

  return (
    <Card className='gap-0 overflow-hidden py-0 shadow-card'>
      <div className='border-b border-border/70 px-5 py-4'>
        <h2 className='text-sm font-semibold tracking-tight'>快捷操作</h2>
        <p className='mt-1 text-xs text-muted-foreground'>
          常用的分析入口，直接开始工作
        </p>
      </div>
      <div className='space-y-2 p-4'>
        {items.map((item) => (
          <button
            key={item.key}
            type='button'
            onClick={item.onClick}
            className='group flex w-full items-center gap-3 rounded-lg border border-transparent px-2.5 py-2.5 text-left transition-colors hover:border-border/80 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
          >
            <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary'>
              <item.icon className='size-4' strokeWidth={1.9} />
            </span>
            <span className='min-w-0 flex-1'>
              <span className='block text-sm font-medium'>{item.title}</span>
              <span className='mt-0.5 block text-xs leading-relaxed text-muted-foreground'>
                {item.description}
              </span>
            </span>
            <ChevronRight className='size-4 shrink-0 text-border transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground' />
          </button>
        ))}
      </div>
      <input
        id='geneai-quick-fasta'
        type='file'
        accept='.fasta,.fa,.fna,.txt'
        className='hidden'
        onChange={(event) => {
          handleFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
    </Card>
  )
}
