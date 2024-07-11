import { describe, it } from "node:test"
import assert from "node:assert"
//import { renderToString } from "../../index.js"
import { reconcileChildren } from "../../reconciler.js"
import { ctx } from "../../globals.js"
import * as kaioken from "../../index.js"
import { elementTypes } from "../../constants.js"
import { shuffle } from "./utils.js"

describe("reconciler", () => {
  it("correctly handles reordered Array children with keys", (t) => {
    const items = "abcdefghijklmnopqrstuvwxyz".split("")
    const node = kaioken.createElement("div", null)

    ctx.current = new kaioken.AppContext(() => null)
    const mockRequestDeleteFn = t.mock.fn<(node: Kaioken.VNode) => void>(
      () => {}
    )
    ctx.current.requestDelete = mockRequestDeleteFn

    node.child =
      reconcileChildren(node, null, [
        items.map((i) => kaioken.createElement("div", { key: i }, i)),
      ]) || undefined

    assert.strictEqual(
      node.child?.type,
      elementTypes.fragment,
      "node's child is a fragment"
    )

    const reconcileFragmentChildren = () => {
      node.child!.child =
        reconcileChildren(
          node.child!,
          node.child!.child!,
          items.map((i) => kaioken.createElement("div", { key: i }, i))
        ) || undefined

      // pseudo 'commit' step
      let n: Kaioken.VNode | undefined = node.child?.child
      while (n) {
        n.prev = { ...n, props: { ...n.props }, prev: undefined }
        n = n.sibling
      }
    }
    const ensureFragmentChildKeys = (opName: string) => {
      let c: Kaioken.VNode | undefined = node.child?.child
      for (let i = 0; i < items.length; i++) {
        assert.strictEqual(
          c?.props.key,
          items[i],
          `[${opName}]: key for ${i}th should be ${items[i]}`
        )
        c = c?.sibling
      }

      assert.strictEqual(
        c,
        undefined,
        `[${opName}]: should be no more children`
      )
    }

    reconcileFragmentChildren()

    for (let i = 0; i < 20; i++) {
      items.reverse()
      reconcileFragmentChildren()
      ensureFragmentChildKeys("list_reversal")

      shuffle(items)
      reconcileFragmentChildren()
      ensureFragmentChildKeys("list_randomization")

      // should not have any more delete calls yet
      assert.strictEqual(
        mockRequestDeleteFn.mock.calls.length,
        i,
        `delete was not called ${i} times`
      )

      items.splice(Math.floor(Math.random() * items.length), 1)
      reconcileFragmentChildren()
      ensureFragmentChildKeys("item_removal")

      // should have called delete i + 1 times
      assert.strictEqual(
        mockRequestDeleteFn.mock.calls.length,
        i + 1,
        `delete was not called ${i + 1} times`
      )
    }
  })
})
