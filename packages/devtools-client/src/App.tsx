import { AppViewIcon, StoresViewIcon } from "devtools-shared"
import { signal } from "kaioken"
import { AppTabView } from "./tabs/AppTabView"
import { StoresTabView } from "./tabs/StoresTabView"

type TabViewProps = { active: boolean; children: JSX.Element }

const TabView = (props: TabViewProps) => {
  return (
    <main
      className="flex flex-col flex-1 max-h-screen overflow-y-auto"
      style={props.active ? {} : { display: "none" }}
    >
      {props.children}
    </main>
  )
}

const APP_TABS = {
  Apps: {
    Icon: AppViewIcon,
    View: (props: { active: boolean }) => {
      return (
        <TabView active={props.active}>
          <AppTabView />
        </TabView>
      )
    },
  },
  Stores: {
    Icon: StoresViewIcon,
    View: (props: { active: boolean }) => {
      return (
        <TabView active={props.active}>
          <StoresTabView />
        </TabView>
      )
    },
  },
}

const selectedTab = signal<keyof typeof APP_TABS>("Apps")

export function App() {
  return (
    <>
      <nav className="flex flex-col gap-2 p-2 bg-neutral-400 bg-opacity-5 border border-neutral-400 border-opacity-5 rounded">
        {Object.keys(APP_TABS).map((key) => (
          <TabButton key={key} title={key as keyof typeof APP_TABS} />
        ))}
      </nav>
      {Object.entries(APP_TABS).map(([title, { View }]) => (
        <View key={title} active={selectedTab.value === title} />
      ))}
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
      <span className="hidden md:inline">{title}</span>
    </button>
  )
}
