type DevtoolsHostMessage =
  | { type: "apps"; apps: { id: number; name: string }[] }
  | { type: "mount"; app: { id: number; name: string } }
  | { type: "unmount"; app: { id: number; name: string } }

type AppRef = { id: number; name: string }
