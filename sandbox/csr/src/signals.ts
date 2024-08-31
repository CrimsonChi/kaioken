import { computed, signal } from "kaioken"

export const count = signal(0)
count.displayName = "count"

export const isTracking = signal(false)
isTracking.displayName = "isTracking"

export const double = computed(() => {
  if (isTracking.value) {
    return count.value * 2
  }

  return 0
})

double.displayName = "double"
