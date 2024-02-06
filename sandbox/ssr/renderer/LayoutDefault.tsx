export function LayoutDefault({ children }: { children?: JSX.Element[] }) {
  return (
    <div className="flex m-auto w-full">
      <Sidebar>
        <a className="navitem" href="/">
          home
        </a>
        <a className="navitem" href="/users">
          users
        </a>
      </Sidebar>
      <Content>{children}</Content>
    </div>
  )
}

function Sidebar({ children }: { children?: JSX.Element[] }) {
  return (
    <div className="p-5 pt-10 shrink-0 flex flex-col items-center">
      {children}
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
