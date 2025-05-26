import { Router, Route, Link } from "kaioken/router"
import { ROUTES } from "./routes"
import { ElementProps, useSignal } from "kaioken"
import { className as cls } from "kaioken/utils"

const Home: Kaioken.FC = () => {
  const divClass = useSignal("text-2xl")
  console.log("Home")
  return (
    <div>
      <h1>Home</h1>
      <button
        onclick={() =>
          (divClass.value =
            divClass.value === "text-2xl" ? "text-4xl" : "text-2xl")
        }
      >
        toggle
      </button>
      <SpecialDiv className={divClass}>test</SpecialDiv>
    </div>
  )
}

function SpecialDiv({ className, ...props }: ElementProps<"div">) {
  return (
    <div className={cls("font-bold", className?.toString())} {...props}>
      test
    </div>
  )
}

function Nav() {
  return (
    <nav className=" min-h-screen p-2  mb-5 h-full">
      <div className="sticky top-0 flex flex-col gap-2">
        <Link to={"/"}>Home</Link>
        {Object.entries(ROUTES).map(([path, route]) => (
          <Link key={route.title} to={path}>
            {route.title}
          </Link>
        ))}
        <Link to="/unhandled-route">Unhandled route</Link>
      </div>
    </nav>
  )
}

export function App() {
  return (
    <>
      <Nav />
      <main className="flex items-center justify-center flex-grow w-full">
        <Router>
          <Route path="/" element={<Home />} />
          {Object.entries(ROUTES).map(([path, route]) => (
            <Route
              key={path}
              path={path}
              element={<route.component />}
              fallthrough={route.fallthrough}
            />
          ))}
          <Route path="*" element={<h1>Uh-oh! Page not found :C</h1>} />
        </Router>
      </main>
    </>
  )
}
