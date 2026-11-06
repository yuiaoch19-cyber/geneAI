import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  CodonResult,
  TranscriptionResult,
  TranslationResult,
} from '@/types/api'

export type PlayerPhase = 'idle' | 'transcribing' | 'translating' | 'done'

export interface PlayerFrame {
  index: number
  total: number
  phase: PlayerPhase
  rnaCount: number
  codonCount: number
  currentBase: number | null
  currentCodon: CodonResult | null
  translatedProtein: string
}

export interface PlayerApi {
  frame: PlayerFrame
  playing: boolean
  speed: number
  play: () => void
  pause: () => void
  toggle: () => void
  next: () => void
  prev: () => void
  replay: () => void
  setSpeed: (speed: number) => void
}

const BASE_INTERVAL = 900

export function useCentralDogmaPlayer(
  transcription: TranscriptionResult | null,
  translation: TranslationResult | null
): PlayerApi {
  const rnaLength = transcription?.rna.length ?? 0
  const codons = useMemo(() => translation?.codons ?? [], [translation])
  const total = rnaLength + codons.length

  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    // 新一轮分析结果到达时回到起点并自动播放
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(0)
    setPlaying(rnaLength > 0)
  }, [transcription, translation, rnaLength])

  useEffect(() => {
    if (!playing) return
    if (total === 0 || index >= total) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlaying(false)
      return
    }
    const timer = window.setTimeout(
      () => setIndex((current) => Math.min(current + 1, total)),
      BASE_INTERVAL / speed
    )
    return () => window.clearTimeout(timer)
  }, [playing, index, total, speed])

  const frame = useMemo<PlayerFrame>(() => {
    const rnaCount = Math.min(index, rnaLength)
    const codonCount = Math.max(0, Math.min(index - rnaLength, codons.length))
    const phase: PlayerPhase =
      index === 0
        ? 'idle'
        : index >= total
          ? 'done'
          : index <= rnaLength
            ? 'transcribing'
            : 'translating'

    return {
      index,
      total,
      phase,
      rnaCount,
      codonCount,
      currentBase: index > 0 && index <= rnaLength ? index - 1 : null,
      currentCodon: codonCount > 0 ? codons[codonCount - 1] : null,
      translatedProtein: translation
        ? translation.protein.slice(0, codonCount)
        : '',
    }
  }, [index, rnaLength, codons, total, translation])

  const play = useCallback(() => {
    if (total === 0) return
    if (index >= total) setIndex(0)
    setPlaying(true)
  }, [index, total])

  const pause = useCallback(() => setPlaying(false), [])

  const toggle = useCallback(() => {
    setPlaying((current) => {
      if (!current) {
        if (total === 0) return false
        if (index >= total) setIndex(0)
      }
      return !current
    })
  }, [index, total])

  const next = useCallback(() => {
    setPlaying(false)
    setIndex((current) => Math.min(current + 1, total))
  }, [total])

  const prev = useCallback(() => {
    setPlaying(false)
    setIndex((current) => Math.max(current - 1, 0))
  }, [])

  const replay = useCallback(() => {
    setIndex(0)
    setPlaying(total > 0)
  }, [total])

  return {
    frame,
    playing,
    speed,
    play,
    pause,
    toggle,
    next,
    prev,
    replay,
    setSpeed,
  }
}
