import { ElementProps, useState } from "kaioken"
import { Chevron } from "./Chevron"

export function ValueEditor({
  data,
  onChange,
  mutable,
  objectRefAcc,
  keys = [],
}: {
  data: Record<string, unknown>
  onChange: (keys: string[], value: unknown) => void
  mutable: boolean
  objectRefAcc: unknown[]
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
            <ValueFieldEditor
              value={data[key]}
              onChange={onChange}
              keys={_keys}
              path={path}
              label={key}
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
  label,
}: {
  value: unknown
  onChange: (keys: string[], value: unknown) => void
  keys: string[]
  path: string
  mutable: boolean
  objectRefAcc: unknown[]
  label: string
}) {
  const [collapsed, setCollapsed] = useState(true)
  const Label = (
    <label
      htmlFor={path}
      className="text-xs truncate"
      title={path}
      children={label}
    />
  )

  if (value === null) {
    return (
      <ObjectPropertyWrapper>
        {Label}
        <TextValueDisplay>null</TextValueDisplay>
      </ObjectPropertyWrapper>
    )
  } else if (value === undefined) {
    return (
      <ObjectPropertyWrapper>
        {Label}
        <TextValueDisplay>undefined</TextValueDisplay>
      </ObjectPropertyWrapper>
    )
  }
  if (value instanceof (window.opener.Node as typeof Node)) {
    return (
      <ObjectPropertyWrapper>
        {Label}
        <TextValueDisplay>
          {"<"}
          <span style={{ color: "#f0a05e" }}>{value.nodeName}</span>
          {"/>"}
        </TextValueDisplay>
      </ObjectPropertyWrapper>
    )
  }
  const handleChange = (newValue: unknown) => onChange(keys, newValue)
  switch (typeof value) {
    case "string":
      return (
        <ObjectPropertyWrapper>
          {Label}
          <ValueInput
            disabled={!mutable}
            id={path}
            type="text"
            value={value}
            onchange={(e) => handleChange(e.target.value)}
          />
        </ObjectPropertyWrapper>
      )
    case "number":
      return (
        <ObjectPropertyWrapper>
          {Label}
          <ValueInput
            disabled={!mutable}
            id={path}
            type="number"
            value={value}
            placeholder="NaN"
            onchange={(e) => handleChange(Number(e.target.value))}
          />
        </ObjectPropertyWrapper>
      )
    case "bigint":
      return (
        <ObjectPropertyWrapper>
          {Label}
          <ValueInput
            disabled={!mutable}
            id={path}
            type="number"
            value={value.toString()}
            onchange={(e) => handleChange(BigInt(e.target.value))}
          />
        </ObjectPropertyWrapper>
      )
    case "boolean":
      return (
        <ObjectPropertyWrapper>
          {Label}
          <input
            disabled={!mutable}
            id={path}
            type="checkbox"
            checked={value}
            onchange={(e) => handleChange(e.target.checked)}
            className="accent-red-500"
          />
        </ObjectPropertyWrapper>
      )
    case "function":
      return (
        <ObjectPropertyWrapper>
          {Label}
          <TextValueDisplay>{`ƒ ${value.name || "anonymous"}()`}</TextValueDisplay>
        </ObjectPropertyWrapper>
      )
    default:
      if (Array.isArray(value)) {
        return (
          <ObjectPropertyWrapper>
            {Label}
            <TextValueDisplay>Array({value.length})</TextValueDisplay>
          </ObjectPropertyWrapper>
        )
      }
      if (objectRefAcc.includes(value)) {
        return (
          <ObjectPropertyWrapper>
            {Label}
            <TextValueDisplay>Object(circular reference)</TextValueDisplay>
          </ObjectPropertyWrapper>
        )
      }
      objectRefAcc.push(value)
      return (
        <ObjectPropertyWrapper>
          <button
            className="text-xs flex items-center gap-1 cursor-pointer w-full"
            title={path}
            onclick={() => {
              objectRefAcc.splice(objectRefAcc.indexOf(value), 1)
              setCollapsed((c) => !c)
            }}
          >
            {label}
            <Chevron
              width={10}
              height={10}
              className={`transition ${collapsed ? "" : "rotate-90"}`}
            />
          </button>
          {collapsed ? null : (
            <ValueEditor
              data={value as Record<string, unknown>}
              onChange={onChange}
              keys={keys}
              mutable={mutable}
              objectRefAcc={objectRefAcc}
            />
          )}
        </ObjectPropertyWrapper>
      )
  }
}

function ObjectPropertyWrapper({ children }: { children: JSX.Element }) {
  return (
    <div className="flex flex-col items-start gap-1 w-full">{children}</div>
  )
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
