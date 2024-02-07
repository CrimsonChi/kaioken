import { Navbar } from "$/components/Navbar"

export function LayoutDefault({ children }: { children?: JSX.Element[] }) {
  return (
    <div className="flex flex-col m-auto w-full">
      <Navbar />
      <Content>{children}</Content>
    </div>
  )
}

function Content({ children }: { children?: JSX.Element[] }) {
  return (
    <div className="p-5 pb-10 border-l-2 border-gray-500 min-h-screen flex-grow">
      {children}
    </div>
  )
}
