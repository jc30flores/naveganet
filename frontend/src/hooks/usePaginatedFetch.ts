import { QueryKey, useQuery, UseQueryOptions } from '@tanstack/react-query';

interface PaginatedOptions<TData> {
  page: number;
  pageSize: number;
  queryKey: QueryKey;
  fetcher: (page: number, pageSize: number) => Promise<TData>;
  enabled?: boolean;
  queryOptions?: Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'>;
}

export function usePaginatedFetch<TData>({
  page,
  pageSize,
  queryKey,
  fetcher,
  enabled = true,
  queryOptions,
}: PaginatedOptions<TData>) {
  const safeSize = Math.max(1, Math.min(pageSize, 100));
  const key = Array.isArray(queryKey)
    ? [...queryKey, page, safeSize]
    : [queryKey, page, safeSize];

  const query = useQuery<TData>({
    queryKey: key,
    queryFn: () => fetcher(page, safeSize),
    keepPreviousData: true,
    enabled,
    ...queryOptions,
  });

  return { ...query, pageSize: safeSize };
}
