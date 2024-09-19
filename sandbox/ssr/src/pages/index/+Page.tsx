import { Signal, signal, useEffect, useState } from "kaioken"
export function Page() {
  const [codeInput, setCodeInput] = useState(
    "const x = () => <h1>Hello World!</h1>"
  )
  const compiled = signal<string | undefined>(undefined)
  const compiled2 = signal<string | undefined>(undefined)
  const compiled3 = signal<number | undefined>(undefined)
  useEffect(() => {
    compiled.value = "bar"
    compiled2.value = "test"
    compiled3.value = 123
  }, [codeInput])
  return (
    <div className="p-6">
      <textarea
        style="width: 100%;"
        value={codeInput}
        oninput={(e) => setCodeInput(e.target.value)}
      />
      <pre>
        <code style="white-space:normal;">
          foo {compiled} {compiled2} baz {compiled3}
        </code>
      </pre>
    </div>
  )
}
