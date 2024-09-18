import { PageTitle } from "$/components/PageTitle"
import { signal, useState } from "kaioken"

export { Page }

function Page() {
  const [option, setOption] = useState<"A" | "B">("A")
  const className = signal("text-red-500")
  const disabled = signal(false)
  return (
    <div className="w-full h-full flex items-center justify-center">
      <PageTitle>Home</PageTitle>
      <div>
        <p className={className}>option: {option}</p>
        <input
          type="radio"
          name="option"
          value="A"
          disabled={disabled}
          checked={option === "A"}
          onchange={(e) => setOption(e.target.value as any)}
        />
        <input
          type="radio"
          name="option"
          value="B"
          checked={option === "B"}
          onchange={(e) => setOption(e.target.value as any)}
        />
      </div>
    </div>
  )
}
