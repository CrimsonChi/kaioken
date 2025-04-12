import { renderMode } from "./globals.js"
import { useRef, useThrowHandler } from "./hooks/index.js"

export { ErrorBoundary }

type ErrorBoundaryProps = {
  fallback: JSX.Element
  logger?: (error: Error) => void
  children: JSX.Children
}

function isError(value: any): value is Error {
  return value instanceof Error
}

function ErrorBoundary({ children, fallback, logger }: ErrorBoundaryProps) {
  const err = useRef<Error | null>(null)
  useThrowHandler<Error>({
    accepts: isError,
    onThrow: (value) => {
      logger?.(value)
      err.current = value
    },
    onServerThrow() {},
  })

  if (renderMode.current === "string" || renderMode.current === "stream") {
    return fallback
  }

  if (err.current) {
    return fallback
  }

  return children
}
