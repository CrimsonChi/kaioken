import { kaiokenErrorSymbol } from "./constants.js"
export class KaiokenError extends Error {
  [kaiokenErrorSymbol] = true
  static isKaiokenError(error: unknown): error is KaiokenError {
    return (
      error instanceof Error &&
      (error as KaiokenError)[kaiokenErrorSymbol] === true
    )
  }
}
