import { unwrap, type ElementProps, type Signal } from "kaioken"

type FilterProps = ElementProps<"div"> & {
  value: Signal<string>
}
export function Filter({ value, className, ...props }: FilterProps) {
  return (
    <div
      className={[
        "w-full p-2 z-10",
        "bg-[#1d1d1d] border border-neutral-400 border-opacity-5 rounded",
        unwrap(className),
      ]}
      {...props}
    >
      <input
        className={[
          "px-2 py-1 w-full rounded focus:outline focus:outline-primary",
          "bg-[#212121] border border-white border-opacity-10 rounded",
        ]}
        placeholder="Filter..."
        type="text"
        bind:value={value}
      />
    </div>
  )
}
