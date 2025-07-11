import type { Signal } from "./base.js"
import type { SignalValues } from "./types.js"

type ForProps<T extends Signal<any[]>> = {
  each: T
  children: (
    value: T extends Signal<infer U>
      ? U extends Array<infer V>
        ? V
        : never
      : never,
    index: number
  ) => JSX.Element
}
export function For<T extends Signal<any[]>>({ each, children }: ForProps<T>) {
  return each.value.map((v, i) => children(v, i))
}

type DeriveChildrenArgs<T extends Signal<any> | Signal<any>[]> =
  T extends Signal<any>[]
    ? SignalValues<T>
    : [T extends Signal<infer V> ? V : never]

export type DeriveProps<T extends Signal<any> | Signal<any>[]> = {
  from: T
  children: (...values: DeriveChildrenArgs<T>) => JSX.Children
}

export function Derive<const T extends Signal<any> | Signal<any>[]>({
  from,
  children,
}: DeriveProps<T>) {
  const args = (Array.isArray(from) ? from : [from]).map(
    (s) => s.value
  ) as DeriveChildrenArgs<T>
  return children(...args)
}
