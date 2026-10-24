import { onUnmounted, ref, watch, type Ref } from 'vue'

export function useDebouncedRef<S, T>(
  source: Ref<S>,
  delayMs: number,
  transform: (value: S) => T,
  initialValue: T,
): Ref<T> {
  const debounced = ref(initialValue) as Ref<T>
  let timer: number | undefined

  watch(source, (value) => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      debounced.value = transform(value)
    }, delayMs)
  })

  onUnmounted(() => {
    window.clearTimeout(timer)
  })

  return debounced
}
