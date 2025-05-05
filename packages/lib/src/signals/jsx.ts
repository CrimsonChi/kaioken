import type { Signal } from "."

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

export type DeriveProps<T extends Signal<any>> = {
  from: T
  children: (value: T extends Signal<infer U> ? U : never) => JSX.Children
}
export function Derive<T extends Signal<any>>({
  from,
  children,
}: DeriveProps<T>) {
  return children(from.value)
}
