export function Avatar({ url, size = 50 }: { url: string; size?: number }) {
  return (
    <div className="flex p-2 rounded-full bg-white bg-opacity-15 w-fit">
      <img src={url} width={size} height={size} />
    </div>
  )
}
