export function navigate(to: string, options?: { replace?: boolean }) {
  /**
   * postpone until next tick to allow for cases where
   * navigate is called programatically upon new route render
   */
  setTimeout(() => {
    if (options?.replace) {
      window.history.replaceState({}, "", to)
    } else {
      window.history.pushState({}, "", to)
    }
    window.dispatchEvent(new PopStateEvent("popstate", { state: {} }))
  }, 0)
  return null
}
