import { PageProps } from "./types"

export type PageDataGetter = (req: {
  params: Record<string, string>
  query: Record<string, string>
}) => Promise<{ title: string; data?: PageProps["data"] }>

export const pages: Array<[string, PageDataGetter]> = []

export function registerPage(path: string, getter: PageDataGetter) {
  pages.push([path, getter])
}
