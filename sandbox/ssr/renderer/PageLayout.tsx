import "./index.css"

export { PageLayout }

function PageLayout({ children }: { children?: JSX.Element[] }) {
  return (
    <Layout>
      <Sidebar>
        <a className="navitem" href="/">
          HOME
        </a>
        <a className="navitem" href="/test">
          TEST
        </a>
      </Sidebar>
      <Content>{children}</Content>
    </Layout>
  )
}

function Layout({ children }: { children?: JSX.Element[] }) {
  return <div className="flex max-w-[900px] m-auto">{children}</div>
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
    <div className="p-5 pb-10 border-l-2 border-gray-500 min-h-screen">
      {children}
    </div>
  )
}
