import { $MEMO } from "./constants.js"
import { createElement } from "./element.js"
import { __DEV__ } from "./env.js"

function _arePropsEqual<T extends Record<string, unknown>>(
  prevProps: T,
  nextProps: T
) {
  const keys = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)])
  for (const key of keys) {
    if (prevProps[key] !== nextProps[key]) {
      return false
    }
  }
  return true
}

export type MemoFn = Function & {
  [$MEMO]: {
    arePropsEqual: (
      prevProps: Record<string, unknown>,
      nextProps: Record<string, unknown>
    ) => boolean
  }
}

export function memo<T extends Record<string, unknown> = {}>(
  fn: Kaioken.FC<T>,
  arePropsEqual: (prevProps: T, nextProps: T) => boolean = _arePropsEqual
): (props: T) => JSX.Element {
  return Object.assign(
    function Memo(props: T) {
      return createElement(fn, props)
    },
    {
      [$MEMO]: { arePropsEqual },
      displayName: "Kaioken.memo",
    }
  )
}

export function isMemoFn(fn: any): fn is MemoFn {
  return (
    typeof fn === "function" &&
    fn[$MEMO] &&
    typeof fn[$MEMO].arePropsEqual === "function"
  )
}
