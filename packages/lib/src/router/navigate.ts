export function navigate(to: string) {
  /**
   * postpone until next tick to allow for cases where
   * navigate is called programatically upon new route render
   */
  setTimeout(() => {
    window.history.pushState({}, "", to)
    window.dispatchEvent(new PopStateEvent("popstate", { state: {} }))
  }, 0)
  return null
}
