import '../../globals.css'

function App() {
  return (
    <main className="w-full h-full min-h-screen max-w-full bg-primary/5 grid place-content-center">
      <span className="text-4xl text-center text-primary/80 font-bold">The Kaioken Devtools</span>
      <ChildComponent />
    </main>
  )
}

function ChildComponent() {
  return <h1>Hello I ams child component</h1>
}

export default App
