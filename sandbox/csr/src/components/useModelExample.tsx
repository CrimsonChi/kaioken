import { useModel } from "kaioken"

export function UseModelExample() {
  return (
    <div className="flex flex-col gap-2">
      <ModelInputText />
      <ModelInputCheck />
      <ModelInputFile />
      <ModelInputRange />
      <ModelSelect />
      <ModelTextArea />
    </div>
  )
}

function ModelTextArea() {
  const [ref, val] = useModel("test")
  console.log("ModelTextArea", val)
  return (
    <div>
      <textarea ref={ref} />
    </div>
  )
}

function ModelInputRange() {
  const [ref, val] = useModel("12")
  console.log("ModelInputRange", val)
  return (
    <div>
      <input ref={ref} type="range" />
    </div>
  )
}

function ModelInputFile() {
  const [ref, val, setVal] = useModel(null as FileList | null)
  console.log("ModelInputFile", val)
  return (
    <div>
      <input ref={ref} type="file" multiple />
      <button onclick={() => setVal(null)}>Clear</button>
    </div>
  )
}

function ModelInputCheck() {
  const [ref, val] = useModel(true)
  console.log("ModelInputCheck", val)
  return (
    <div>
      <input ref={ref} type="checkbox" />
    </div>
  )
}

function ModelInputText() {
  const [ref, val, setVal] = useModel("test")
  //setVal("")
  console.log("ModelInputText", val)
  return (
    <div>
      <input ref={ref} type="text" />
      <button onclick={() => setVal("")}>Clear</button>
    </div>
  )
}
function ModelSelect() {
  const [ref, val] = useModel("B")
  console.log("ModelSelect", val)
  return (
    <div>
      <select ref={ref}>
        {["A", "B", "C", "D", "E", "F"].map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </div>
  )
}
