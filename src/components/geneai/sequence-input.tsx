import { useMemo, useRef } from 'react'
import { CircleAlert, Eraser, FlaskConical, Upload } from 'lucide-react'
import { analyzeSequence, formatNumber, formatPercent } from '@/lib/dna'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { BaseBadge } from '@/components/geneai/base-badge'

type SequenceInputProps = {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  onFileLoaded?: (payload: { name: string; text: string }) => void
  onLoadDemo?: () => void
  placeholder?: string
  hint?: string
  error?: string
  className?: string
  textareaClassName?: string
}

export function SequenceInput({
  id = 'sequence-input',
  label = 'DNA 序列',
  value,
  onChange,
  onFileLoaded,
  onLoadDemo,
  placeholder = '粘贴 DNA 序列或 FASTA 内容，例如：\n>gene_fragment\nATGGTGCATCTGACTCCTGAGG…',
  hint,
  error,
  className,
  textareaClassName,
}: SequenceInputProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const preview = useMemo(() => analyzeSequence(value), [value])
  const message = error ?? (value.trim() ? preview.issue?.message : undefined)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    const text = await file.text()
    onFileLoaded?.({ name: file.name, text })
    onChange(text)
  }

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Label htmlFor={id} className='text-sm font-medium'>
          {label}
        </Label>
        <div className='flex items-center gap-0.5'>
          <input
            ref={fileRef}
            type='file'
            accept='.fasta,.fa,.fna,.txt'
            className='sr-only'
            onChange={(event) => {
              void handleFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-8 px-2 text-xs text-muted-foreground hover:text-foreground'
            onClick={() => fileRef.current?.click()}
          >
            <Upload className='size-3.5' />
            上传 FASTA
          </Button>
          {onLoadDemo ? (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-8 px-2 text-xs text-muted-foreground hover:text-foreground'
              onClick={onLoadDemo}
            >
              <FlaskConical className='size-3.5' />
              示例
            </Button>
          ) : null}
          {value ? (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-8 px-2 text-xs text-muted-foreground hover:text-foreground'
              onClick={() => onChange('')}
            >
              <Eraser className='size-3.5' />
              清空
            </Button>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-lg border border-input bg-card shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20',
          message && 'border-destructive/50 focus-within:border-destructive'
        )}
      >
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={7}
          spellCheck={false}
          autoComplete='off'
          className={cn(
            'min-h-40 resize-y rounded-none border-0 bg-transparent px-3.5 py-3 font-mono text-[12.5px] leading-6 tracking-wide shadow-none focus-visible:ring-0',
            textareaClassName
          )}
        />
        <div className='flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border/70 bg-muted/30 px-3.5 py-2.5'>
          <span className='text-xs text-muted-foreground'>
            长度{' '}
            <span className='font-mono font-semibold text-foreground tabular-nums'>
              {formatNumber(preview.length)}
            </span>
          </span>
          <span className='hidden h-3 w-px bg-border sm:block' />
          <span className='flex flex-wrap items-center gap-1'>
            <BaseBadge base='A' count={preview.counts.a} />
            <BaseBadge base='T' count={preview.counts.t} />
            <BaseBadge base='G' count={preview.counts.g} />
            <BaseBadge base='C' count={preview.counts.c} />
            {preview.counts.n > 0 ? (
              <BaseBadge base='N' count={preview.counts.n} />
            ) : null}
          </span>
          <span className='ms-auto text-xs text-muted-foreground'>
            GC{' '}
            <span className='font-mono font-semibold text-foreground tabular-nums'>
              {formatPercent(preview.gcContent)}
            </span>
          </span>
        </div>
      </div>

      {message ? (
        <p className='flex items-start gap-1.5 text-xs leading-relaxed text-destructive'>
          <CircleAlert className='mt-0.5 size-3.5 shrink-0' />
          {message}
        </p>
      ) : hint ? (
        <p className='text-xs leading-relaxed text-muted-foreground'>{hint}</p>
      ) : null}
    </div>
  )
}
