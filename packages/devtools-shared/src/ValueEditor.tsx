import { ElementProps } from "kaioken"

export function ValueEditor({
  data,
  onChange,
  mutable,
  objectRefAcc = [],
  keys = [],
}: {
  data: Record<string, unknown>
  onChange: (keys: string[], value: unknown) => void
  mutable: boolean
  objectRefAcc?: unknown[]
  keys?: string[]
}) {
  return (
    <div className="flex flex-col items-start w-full border border-neutral-700">
      {Object.keys(data).map((key) => {
        const _keys = keys.concat(key)
        const path = _keys.join(".")
        return (
          <div
            key={path}
            className="flex flex-col items-start w-full gap-2 pl-2 py-1 pr-1 border-b border-neutral-700"
          >
            <label htmlFor={path} className="text-xs truncate" title={path}>
              {key}
            </label>
            <ValueFieldEditor
              value={data[key]}
              onChange={onChange}
              keys={_keys}
              path={path}
              mutable={mutable}
              objectRefAcc={objectRefAcc}
            />
          </div>
        )
      })}
    </div>
  )
}

function ValueFieldEditor({
  value,
  onChange,
  keys,
  path,
  mutable,
  objectRefAcc,
}: {
  value: unknown
  onChange: (keys: string[], value: unknown) => void
  keys: string[]
  path: string
  mutable: boolean
  objectRefAcc: unknown[]
}) {
  if (value === null) {
    return <TextValueDisplay>null</TextValueDisplay>
  } else if (value === undefined) {
    return <TextValueDisplay>undefined</TextValueDisplay>
  }
  if (value instanceof (window.opener.Node as typeof Node)) {
    return (
      <TextValueDisplay>
        {"<"}
        <span style={{ color: "#f0a05e" }}>{value.nodeName}</span>
        {"/>"}
      </TextValueDisplay>
    )
  }
  const handleChange = (newValue: unknown) => onChange(keys, newValue)
  switch (typeof value) {
    case "string":
      return (
        <ValueInput
          disabled={!mutable}
          id={path}
          type="text"
          value={value}
          onchange={(e) => handleChange(e.target.value)}
        />
      )
    case "number":
      return (
        <ValueInput
          disabled={!mutable}
          id={path}
          type="number"
          value={value}
          placeholder="NaN"
          onchange={(e) => handleChange(Number(e.target.value))}
        />
      )
    case "bigint":
      return (
        <ValueInput
          disabled={!mutable}
          id={path}
          type="number"
          value={value.toString()}
          onchange={(e) => handleChange(BigInt(e.target.value))}
        />
      )
    case "boolean":
      return (
        <input
          disabled={!mutable}
          id={path}
          type="checkbox"
          checked={value}
          onchange={(e) => handleChange(e.target.checked)}
          className="accent-red-500"
        />
      )
    case "function":
      return (
        <TextValueDisplay>{`ƒ ${value.name || "anonymous"}()`}</TextValueDisplay>
      )
    default:
      if (Array.isArray(value)) {
        return <TextValueDisplay>Array({value.length})</TextValueDisplay>
      }
      if (objectRefAcc.includes(value)) {
        return <TextValueDisplay>Object(circular reference)</TextValueDisplay>
      }
      objectRefAcc.push(value)
      return (
        <ValueEditor
          data={value as Record<string, unknown>}
          onChange={onChange}
          keys={keys}
          mutable={mutable}
          objectRefAcc={objectRefAcc}
        />
      )
  }
}

function ValueInput(props: ElementProps<"input">) {
  return (
    <input
      className="flex-grow text-xs px-2 py-1 text-neutral-300 w-full"
      {...props}
    />
  )
}

function TextValueDisplay({ children }: { children: JSX.Element }) {
  return (
    <small className="text-neutral-300">
      <i>{children}</i>
    </small>
  )
}
