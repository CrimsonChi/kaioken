import { $HYDRATION_BOUNDARY } from "../constants.js"
import { createElement } from "../element.js"

export type HydrationBoundaryMode = "eager" | "lazy"
export type HydrationBoundaryProps = {
  /* @default "eager" */
  mode?: HydrationBoundaryMode
  children: JSX.Children
}

export function HydrationBoundary(props: HydrationBoundaryProps) {
  return createElement($HYDRATION_BOUNDARY, props)
}
