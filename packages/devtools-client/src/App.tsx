import { AppViewIcon, StoresViewIcon } from "devtools-shared"
import { signal } from "kaioken"
import { AppTabView } from "./tabs/AppTabView"
import { StoresTabView } from "./tabs/StoresTabView"

const APP_TABS = {
  Apps: {
    Icon: AppViewIcon,
    View: AppTabView,
  },
  Stores: {
    Icon: StoresViewIcon,
    View: StoresTabView,
  },
}

const selectedTab = signal<keyof typeof APP_TABS>("Apps")

export function App() {
  const View = APP_TABS[selectedTab.value].View
  return (
    <>
      <nav className="flex flex-col gap-2 p-2 bg-[#1e1e1e] border-r border-neutral-900">
        {Object.keys(APP_TABS).map((key) => (
          <TabButton key={key} title={key as keyof typeof APP_TABS} />
        ))}
      </nav>
      <main className="flex flex-col flex-1 max-h-screen overflow-y-auto">
        <View />
      </main>
    </>
  )
}

function TabButton({ title }: { title: keyof typeof APP_TABS }) {
  const { Icon } = APP_TABS[title]
  return (
    <button
      key={title}
      onclick={() => {
        selectedTab.value = title
      }}
      className={
        "flex items-center px-2 py-1 gap-2 rounded border text-xs border-white border-opacity-10" +
        (selectedTab.value === title
          ? " bg-white bg-opacity-5 text-neutral-100"
          : " hover:bg-white hover:bg-opacity-10 text-neutral-400")
      }
      title={title}
    >
      <Icon className="text-primary" />
      {title}
    </button>
  )
}
