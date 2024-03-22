import { useModel, useEffect } from "kaioken"

interface Album {
  id: number
  title: string
  artist: string
  url: string
}

const albums: Album[] = [
  {
    id: 1,
    title: "First album",
    artist: "Album artist",
    url: "#",
  },
  {
    id: 2,
    title: "Second album",
    artist: "Album artist",
    url: "#",
  },
  {
    id: 3,
    title: "Third album",
    artist: "Album artist",
    url: "#",
  },
  {
    id: 4,
    title: "Fourth album",
    artist: "Album artist",
    url: "#",
  },
  {
    id: 5,
    title: "Fifth album",
    artist: "Album artist",
    url: "#",
  },
]

export function FilteredList() {
  const [inputRef, inputValue] = useModel<HTMLInputElement, string>("")
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filteredAlbums = albums.filter(
    (a) => a.title.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
  )

  return (
    <div>
      <div className="max-w-[340px] p-0 overflow-hidden">
        <div className=" p-4">
          <h2 className="mb-4 font-bold text-lg">Albums</h2>
          <div className="sticky top-0 bg-stone-700 mb-4 flex rounded z-10 shadow-md shadow-stone-900">
            <input
              ref={inputRef}
              type="text"
              className="bg-transparent pl-8 w-full text-sm py-1 "
              placeholder="Search"
            />
          </div>
          {filteredAlbums.length === 0 ? (
            <span data-test className="text-muted">
              No albums found
            </span>
          ) : filteredAlbums.length % 2 === 0 ? (
            <i data-test className="text-muted">
              Even
            </i>
          ) : (
            <p data-test className="text-muted">
              Odd
            </p>
          )}
          <AlbumList albums={filteredAlbums} />
        </div>
      </div>
      <span className="block text-neutral-400 w-5/12">
        This component also demonstrates the ability to accurately update the
        DOM and keep children ordering correct, even when a tag is dynamically
        swapped
      </span>
    </div>
  )
}

function AlbumList({ albums }: { albums: Album[] }) {
  return (
    <>
      {albums.map((album) => (
        <AlbumItem key={"album-" + album.id} album={album} />
      ))}
    </>
  )
}
function AlbumItem({ album }: { album: Album; key: string }) {
  return (
    <div className="flex items-center gap-4">
      <button role="none" className="p-2 border-2 border-light rounded">
        PlayIcon
      </button>
      <div className="flex-grow">
        <h4 className="font-bold">{album.title}</h4>
        <span className="text-muted">{album.artist}</span>
      </div>
      LikeButton
    </div>
  )
}
