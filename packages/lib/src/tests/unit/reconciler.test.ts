import { describe, it } from "node:test"
import assert from "node:assert"
import { reconcileChildren } from "../../reconciler.js"
import { ctx } from "../../globals.js"
import * as kaioken from "../../index.js"
import { EffectTag } from "../../constants.js"
import { shuffle } from "./utils.js"

describe("reconciler", () => {
  it("correctly handles reordered Array children with keys", (t) => {
    ctx.current = new kaioken.AppContext(() => null)
    const mockRequestDeleteFn = t.mock.fn<(node: Kaioken.VNode) => void>(
      () => {}
    )
    ctx.current.requestDelete = mockRequestDeleteFn

    const items = "abcdefghijklmnopqrstuvwxyz".split("")
    const node = kaioken.createElement("div")
    node.child = reconcileChildren(node, null, [
      items.map((i) => kaioken.createElement("div", { key: i }, i)),
    ])!
    // node.child.child = {type: "fragment", props: {children: [...items.map(i => kaioken.createElement("div", {key: i}, i))]}}

    const commitFragmentChildren = () => {
      let n: Kaioken.VNode | undefined = node.child!.child
      while (n) {
        n.prev = { ...n, props: { ...n.props }, prev: undefined }
        n = n.sibling
      }
    }
    const reconcileFragmentChildren = () => {
      node.child!.child =
        reconcileChildren(
          node.child!,
          node.child!.child || null,
          items.map((i) => kaioken.createElement("div", { key: i }, i))
        ) || undefined
    }
    const assertFragmentChildStates = (opName: string) => {
      let c: Kaioken.VNode | undefined = node.child!.child!
      for (let i = 0; i < items.length; i++) {
        assert.strictEqual(
          c!.props.key,
          items[i],
          `[${opName}]: key for ${i}th child should be ${items[i]}`
        )
        const prev = c?.prev
        if (prev === undefined || prev.index < i) {
          assert.strictEqual(
            c!.effectTag,
            EffectTag.PLACEMENT,
            `[${opName}]: effectTag for ${i}th child should be "placement"`
          )
        }
        c = c!.sibling
      }

      assert.strictEqual(
        c,
        undefined,
        `[${opName}]: should be no more children`
      )
    }

    reconcileFragmentChildren()
    assertFragmentChildStates("initial")
    commitFragmentChildren()

    for (let i = 0; i < 20; i++) {
      items.reverse()
      reconcileFragmentChildren()
      assertFragmentChildStates("list_reversal")
      commitFragmentChildren()

      shuffle(items)
      reconcileFragmentChildren()
      assertFragmentChildStates("list_randomization")
      commitFragmentChildren()

      // should not have any more delete calls yet
      assert.strictEqual(
        mockRequestDeleteFn.mock.calls.length,
        i,
        `delete was not called ${i} times`
      )

      items.splice(Math.floor(Math.random() * items.length), 1)
      reconcileFragmentChildren()
      assertFragmentChildStates("item_removal")
      commitFragmentChildren()

      // should have called delete i + 1 times
      assert.strictEqual(
        mockRequestDeleteFn.mock.calls.length,
        i + 1,
        `delete was not called ${i + 1} times`
      )
    }
  })
})
