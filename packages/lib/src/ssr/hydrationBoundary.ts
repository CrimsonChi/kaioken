import { createContext } from "../context.js"
import { $HYDRATION_BOUNDARY } from "../constants.js"
import { createElement, Fragment } from "../element.js"
import { renderMode } from "../globals.js"

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
  const provider = createElement(
    HydrationBoundaryContext.Provider,
    { value: { mode: props.mode || "eager" } },
    createElement($HYDRATION_BOUNDARY, props)
  )
  if (renderMode.current === "string" || renderMode.current === "stream") {
    /**
     * in order to ensure consistent tree structure, we're simulating
     * the generated loader + wrapper components here.
     */
    return Fragment({ children: Fragment({ children: provider }) })
  }
  return provider
}
