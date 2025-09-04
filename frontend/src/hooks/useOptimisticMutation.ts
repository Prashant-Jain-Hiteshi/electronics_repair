import { useMutation, UseMutationOptions, QueryKey, useQueryClient } from '@tanstack/react-query'

type Updater<T> = (prev: T | undefined) => T

type OptimisticOptions<TData, TVariables, TError, TContext> = UseMutationOptions<TData, TError, TVariables, TContext> & {
  /** The query keys to optimistically update */
  keys?: QueryKey[]
  /** Given previous cache value return next cache value */
  update?: (variables: TVariables, prev: unknown) => unknown
}

/**
 * A thin wrapper around useMutation that standardizes optimistic UI updates with React Query.
 */
export function useOptimisticMutation<TData = unknown, TError = unknown, TVariables = void, TContext = { previous: Map<string, unknown> }>(
  options: OptimisticOptions<TData, TVariables, TError, TContext>
) {
  const qc = useQueryClient()

  return useMutation<TData, TError, TVariables, TContext>({
    ...options,
    onMutate: async (vars) => {
      const ctx: any = { previous: new Map<string, unknown>() }
      if (options.keys && options.keys.length) {
        await Promise.all(options.keys.map((key) => qc.cancelQueries({ queryKey: key })))
        for (const key of options.keys) {
          const snap = qc.getQueryData(key)
          ctx.previous.set(JSON.stringify(key), snap)
          if (options.update) {
            const next = options.update(vars, snap)
            qc.setQueryData(key, next)
          }
        }
      }
      return ctx
    },
    onError: (err, vars, ctx) => {
      if (ctx && (ctx as any).previous) {
        for (const [key, snap] of (ctx as any).previous.entries()) {
          try { qc.setQueryData(JSON.parse(key), snap) } catch {}
        }
      }
      options.onError?.(err as any, vars, ctx as any)
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'error', message: 'Action failed. Changes were reverted.' } }))
    },
    onSuccess: (data, vars, ctx) => {
      options.onSuccess?.(data, vars, ctx as any)
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'success', message: 'Saved successfully.' } }))
    },
    onSettled: (data, err, vars, ctx) => {
      if (options.keys) {
        options.keys.forEach((key) => qc.invalidateQueries({ queryKey: key }))
      }
      options.onSettled?.(data, err as any, vars, ctx as any)
    }
  })
}
