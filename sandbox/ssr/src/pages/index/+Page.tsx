import { Signal, signal, useEffect, useState } from "kaioken"
export function Page() {
  const [codeInput, setCodeInput] = useState(
    "const x = () => <h1>Hello World!</h1>"
  )
  const compiled = signal("")
  useEffect(() => {
    compiled.value = "bar"
  }, [codeInput])
  return (
    <div className="p-6">
      <textarea
        style="width: 100%;"
        value={codeInput}
        oninput={(e) => setCodeInput(e.target.value)}
      />
      <pre>
        <code style="white-space:normal;">foo {compiled} baz</code>
      </pre>
    </div>
  )
}
