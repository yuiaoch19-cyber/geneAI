import { useQuery } from '@tanstack/react-query'
import { getStatsOverview } from '@/lib/api/geneai'

export const statsKeys = {
  overview: ['stats', 'overview'] as const,
}

export function useStatsOverview(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: statsKeys.overview,
    queryFn: getStatsOverview,
    staleTime: 10_000,
    retry: 1,
    enabled: options?.enabled ?? true,
  })
}
