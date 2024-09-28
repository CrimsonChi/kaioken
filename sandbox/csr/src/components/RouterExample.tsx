import { useState, useRouter, Link, Router, Route } from "kaioken"

export function RouterExample() {
  const [count, setCount] = useState(0)
  const { params, query } = useRouter()
  console.log("RouterTest", params, query)
  return (
    <div>
      <p>query: {query.sort}</p>
      <p>params: {JSON.stringify(params, null, 2)}</p>
      <p>count: {count}</p>
      <button onclick={() => setCount((c) => c + 1)}>+</button>
      <Link to="/?sort=desc">Home</Link>
      <Link to="/child-route/420?sort=desc">Child Route</Link>
      <Router>
        <Route path="/" element={<h2>Home</h2>} />
        <Route path="/child-route/:funny-number" element={<ChildRoute />} />
      </Router>
    </div>
  )
}

function ChildRoute() {
  console.log("ChildRoute")
  const { params, query, setQuery } = useRouter()
  return (
    <div>
      <h2>Child Route - {params["funny-number"]}</h2>
      <button
        onclick={() =>
          setQuery({ sort: query.sort === "desc" ? "asc" : "desc" })
        }
      >
        Sort
      </button>
    </div>
  )
}
