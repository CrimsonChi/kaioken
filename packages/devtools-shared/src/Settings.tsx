import {
  createContext,
  ElementProps,
  Portal,
  Transition,
  useContext,
  useRef,
  useState,
} from "kaioken"
import { ValueEditor } from "./ValueEditor"
import { applyObjectChangeFromKeys } from "./utils"

const storageData = localStorage.getItem("kaioken.devtools.userSettings")
const userSettings: UserSettings = storageData
  ? JSON.parse(storageData)
  : {
      maxArrayChunkSize: 10,
      hotkeys: {
        focusSearch: ["ctrl", "l"],
      },
    }

type UserSettings = {
  maxArrayChunkSize: number
  hotkeys: {
    focusSearch: string[]
  }
}

type SettingsContext = {
  open: boolean
  setOpen: (open: boolean) => void
  userSettings: UserSettings
  saveUserSettings: (newSettings: UserSettings) => void
}

const SettingsContext = createContext<SettingsContext>({
  open: false,
  setOpen: () => {},
  userSettings: null as any as UserSettings,
  saveUserSettings: () => {},
})

export const useSettings = () => useContext(SettingsContext)

export function SettingsProvider({
  children,
}: {
  children: JSX.Children | ((settingsCtx: SettingsContext) => JSX.Element)
}) {
  const [open, setOpen] = useState(false)
  const [_userSettings, setUserSettings] = useState<UserSettings>(userSettings)

  const saveUserSettings = (newSettings: UserSettings) => {
    localStorage.setItem(
      "kaioken.devtools.userSettings",
      JSON.stringify(newSettings)
    )
    setUserSettings(newSettings)
  }

  return (
    <SettingsContext.Provider
      value={{
        open,
        setOpen,
        userSettings: _userSettings,
        saveUserSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function SettingsDrawer() {
  const { open, setOpen, userSettings, saveUserSettings } = useSettings()
  return (
    <Portal container={document.body}>
      <Transition
        in={open}
        element={(state) => (
          <Drawer
            state={state}
            close={() => setOpen(false)}
            userSettings={userSettings}
            saveUserSettings={saveUserSettings}
          />
        )}
      />
    </Portal>
  )
}

type DrawerProps = {
  state: "entering" | "entered" | "exiting" | "exited"
  close: () => void
  userSettings: UserSettings
  saveUserSettings: (newSettings: UserSettings) => void
}

function Drawer({ state, close, userSettings, saveUserSettings }: DrawerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const opacity = state === "entered" ? "1" : "0"
  const pointerEvents = state === "exited" ? "none" : "all"
  const offsetX = state === "entered" ? 0 : 100
  return (
    <Backdrop
      ref={wrapperRef}
      onclick={(e) => e.target === wrapperRef.current && close()}
      style={{ opacity, pointerEvents, transition: "0.3s" }}
    >
      <div
        className="fixed transition-transform h-full bg-neutral-900 w-[300px] p-10"
        style={{ right: "0", transform: `translateX(${offsetX}%)` }}
      >
        <h1>Settings</h1>
        <ValueEditor
          data={userSettings}
          onChange={(keys, value) => {
            const newSettings = {
              ...userSettings,
            }
            applyObjectChangeFromKeys(newSettings, keys, value)
            saveUserSettings(newSettings)
          }}
          mutable={true}
          objectRefAcc={[]}
        />
      </div>
    </Backdrop>
  )
}

export function Backdrop({ children, ...props }: ElementProps<"div">) {
  return (
    <div
      {...props}
      className="w-screen h-screen fixed top-0 left-0 bg-[rgba(0,0,0,0.3)] z-[999999999]"
    >
      {children}
    </div>
  )
}
