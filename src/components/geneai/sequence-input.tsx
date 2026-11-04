import { useMemo, useRef } from 'react'
import { CircleAlert, Eraser, FlaskConical, Upload } from 'lucide-react'
import {
  analyzeSequence,
  formatNumber,
  formatPercent,
  MAX_FASTA_BYTES,
  normalizeSequence,
} from '@/lib/dna'
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
  onFileError?: (message: string) => void
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
  onFileError,
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

    if (file.size > MAX_FASTA_BYTES) {
      onFileError?.(
        `文件「${file.name}」为 ${(file.size / 1024 / 1024).toFixed(1)} MB，超过 2 MB 上限。请截取目标片段后再上传。`
      )
      return
    }

    let text: string
    try {
      text = await file.text()
    } catch {
      onFileError?.('文件读取失败，请确认文件未被占用或损坏。')
      return
    }

    if (!text.trim()) {
      onFileError?.('文件内容为空，请选择包含 DNA 序列的 FASTA 文件。')
      return
    }

    onFileLoaded?.({ name: file.name, text })

    const parsed = normalizeSequence(text)
    if (parsed.issue) {
      // Keep the original text so the inline validation can point at the
      // offending character or FASTA structure instead of showing a blank box.
      onChange(text)
      onFileError?.(parsed.issue.message)
      return
    }
    onChange(parsed.sequence)
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
          {message ? (
            <span className='flex items-center gap-1.5 text-xs text-destructive'>
              <CircleAlert className='size-3.5' />
              含无法识别的字符，暂不统计碱基与 GC
            </span>
          ) : (
            <>
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
            </>
          )}
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
