import { createContext } from "../context.js"
import { $HYDRATION_BOUNDARY } from "../constants.js"
import { createElement } from "../element.js"

export const HYDRATION_BOUNDARY_MARKER = "kaioken:h-boundary"

export type HydrationBoundaryMode = "eager" | "lazy"
export type HydrationBoundaryProps = {
  /* @default "eager" */
  mode?: HydrationBoundaryMode
  children: JSX.Children
}

export const HydrationBoundaryContext = createContext<{
  mode: HydrationBoundaryMode
}>(null!)

export function HydrationBoundary(props: HydrationBoundaryProps) {
  return createElement(
    HydrationBoundaryContext.Provider,
    { value: { mode: props.mode || "eager" } },
    createElement($HYDRATION_BOUNDARY, props)
  )
}
