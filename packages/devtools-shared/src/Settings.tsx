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

type UserSettings = {
  arrayChunkSize: number
  objectKeysChunkSize: number
}

const defaultSettings: UserSettings = {
  arrayChunkSize: 10,
  objectKeysChunkSize: 100,
}

function recursiveObjectValidate(
  obj: Record<string, any>,
  subject: Record<string, any>
) {
  if (Object.keys(obj).length !== Object.keys(subject).length) {
    return false
  }
  const keys = new Set([...Object.keys(obj), ...Object.keys(subject)])
  for (const key in keys) {
    if (typeof subject[key] !== typeof obj[key]) {
      return false
    }
    if (typeof obj[key] === "object") {
      if (!recursiveObjectValidate(obj[key], subject[key])) {
        return false
      }
    }
  }
  return true
}

function recursiveObjectAssign(
  obj: Record<string, any>,
  defaultObj: Record<string, any>,
  assign: (obj: Record<string, any>, key: string, value: any) => void
) {
  for (const key in defaultObj) {
    if (typeof obj[key] === "undefined") {
      obj[key] = structuredClone(defaultObj[key])
    }
  }
  for (const key in obj) {
    if (typeof obj[key] === "object") {
      recursiveObjectAssign(obj[key], defaultObj[key], assign)
    } else {
      assign(obj, key, obj[key])
    }
  }
}

let userSettings: UserSettings = { ...defaultSettings }
const storageData = localStorage.getItem("kaioken.devtools.userSettings")
if (storageData) {
  try {
    const parsed = JSON.parse(storageData)
    if (recursiveObjectValidate(defaultSettings, parsed)) {
      userSettings = parsed
    }
  } catch (error) {
    console.error("kaioken.devtools.userSettings error", error)
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
    <Portal container={() => document.getElementById("portal-root")!}>
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
        className="fixed flex flex-col flex-grow gap-2 p-4 transition-transform h-full bg-neutral-900 w-[300px]"
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
            recursiveObjectAssign(
              newSettings,
              defaultSettings,
              (obj, key, value) => {
                obj[key] = value < 1 ? 1 : value
              }
            )
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
