import { createContext, useContext } from "kaioken"
import { PageProps } from "./types"

export const PageContext = createContext<PageProps["data"]>({})
export const usePage = () => useContext(PageContext)
