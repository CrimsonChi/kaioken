import {
  useElementBounding,
  useElementByPoint,
  useEventListener,
  useMouse,
} from "@kaioken-core/hooks"
import { signal, useCallback, useEffect, useMemo, useRef } from "kaioken"
import { getComponentVnodeFromElement, getNearestElm } from "../utils"
import { vNodeContains } from "kaioken/utils"
import { useDevtoolsStore } from "../store"

export const InspectComponent: Kaioken.FC = () => {
  const {
    value: { popupWindow },
  } = useDevtoolsStore()
  const toggleElementToVnode = signal(false)
  const { mouse } = useMouse()
  const controls = useElementByPoint({
    x: mouse.x,
    y: mouse.y,
    immediate: false,
  })
  const element = toggleElementToVnode.value ? controls.element : null

  const elApp = useMemo(() => {
    if (element && window.__kaioken) {
      const app = window.__kaioken.apps.find(($app) => {
        if ($app.rootNode == null || element.__kaiokenNode == null) return false
        return vNodeContains($app.rootNode, element.__kaiokenNode)
      })

      if (app?.rootNode == null) return null
      return app
    }

    return null
  }, [element])

  const vnode = useMemo(() => {
    if (element) {
      return getComponentVnodeFromElement(element)
    }

    return null
  }, [element])

  const boundingRef = useRef<HTMLElement | null>(null)
  const bounding = useElementBounding(boundingRef)

  const handleToggle = useCallback(() => {
    toggleElementToVnode.value = !toggleElementToVnode.value
  }, [])

  useEffect(() => {
    // @ts-expect-error We have our own custom events
    window.__kaioken?.on("__kaiokenDevtoolsInsepctElementToggle", handleToggle)
    return () => {
      window.__kaioken?.off(
        // @ts-expect-error We have our own custom events
        "__kaiokenDevtoolsInsepctElementToggle",
        handleToggle
      )
    }
  }, [])

  useEffect(() => {
    if (toggleElementToVnode.value) {
      controls.start()
    } else {
      controls.stop()
    }
  }, [toggleElementToVnode.value])

  useEffect(() => {
    if (vnode && element) {
      boundingRef.current = getNearestElm(vnode, element) as HTMLElement
    } else {
      boundingRef.current = null
    }
  }, [vnode, element])

  useEventListener("click", (e) => {
    if (toggleElementToVnode.value === true && vnode && elApp) {
      e.preventDefault()
      window.__kaioken?.emit(
        // @ts-expect-error we have our own custom event
        "__kaiokenDevtoolsInsepctElementNode",
        elApp,
        vnode
      )
      toggleElementToVnode.value = false
      popupWindow?.focus?.()
    }
  })

  return (
    vnode && (
      <div
        className="bg-[crimson]/80 fixed grid place-content-center pointer-events-none z-10 top-0 left-0"
        style={{
          width: `${bounding?.width}px`,
          height: `${bounding?.height}px`,
          transform: `translate(${bounding.x}px, ${bounding.y}px)`,
        }}
      >
        <p>{vnode.type.name}</p>
      </div>
    )
  )
}
