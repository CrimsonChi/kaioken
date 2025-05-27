import { describe, it } from "node:test"
import assert from "node:assert"
import { reconcileChildren } from "../../reconciler.js"
import { ctx } from "../../globals.js"
import * as kaioken from "../../index.js"
import { FLAG } from "../../constants.js"
import { shuffle } from "./utils.js"
import { flags } from "../../flags.js"
import { commitSnapshot } from "../../utils.js"

const commitChildren = (node: Kaioken.VNode) => {
  let n = node.child
  while (n) {
    commitSnapshot(n)
    n = n.sibling
  }
}

describe("reconciler", () => {
  it("correctly handles correctly handles 'mapRemainingChildren' phase when dealing with array children", () => {
    ctx.current = new kaioken.AppContext(() => null)
    const items = "abcdefghijklmnopqrstuvwxyz".split("")
    const node = kaioken.createElement("div")
    node.child = reconcileChildren(node, [
      items.map((i) => kaioken.createElement("div", { key: i }, i)),
    ])!

    const reconcileChildFragment = () => {
      node.child!.child = reconcileChildren(
        node.child!,
        items.map((i) => kaioken.createElement("div", { key: i }, i))
      )
    }

    commitChildren(node.child)
    shuffle(items)
    reconcileChildFragment()
    commitChildren(node.child)
    shuffle(items)
    reconcileChildFragment()
    commitChildren(node.child)
    shuffle(items)
    reconcileChildFragment()
    // should not have any delete calls
    assert.strictEqual(
      node.child.deletions?.length || 0,
      0,
      `delete was called but should not have`
    )
  })
  it("correctly handles reordered Array children with keys", () => {
    ctx.current = new kaioken.AppContext(() => null)

    const items = "abcdefghijklmnopqrstuvwxyz".split("")
    const node = kaioken.createElement("div")
    node.child = reconcileChildren(node, [
      items.map((i) => kaioken.createElement("div", { key: i }, i)),
    ])

    const reconcileChildFragment = () => {
      node.child!.child = reconcileChildren(
        node.child!,
        items.map((i) => kaioken.createElement("div", { key: i }, i))
      )
    }

    const assertChildStates = (opName: string) => {
      let i = 0,
        c: Kaioken.VNode | null = node.child!.child!

      while (c) {
        assert.strictEqual(
          c.props.key,
          items[i],
          `[${opName}]: key for ${i}th child should be ${items[i]}`
        )
        const prev = c.prev
        if (!prev || prev.index < i) {
          assert.strictEqual(
            flags.get(c!.flags, FLAG.PLACEMENT),
            true,
            `[${opName}]: ${i}th child should have flag "placement"`
          )
        }
        c = c.sibling
        i++
      }

      assert.strictEqual(
        i,
        items.length,
        `[${opName}]: should be no more children`
      )
    }

    reconcileChildFragment()
    assertChildStates("initial")
    commitChildren(node.child!)

    let totalDeletions = 0
    for (let i = 0; i < 20; i++) {
      items.reverse()
      reconcileChildFragment()
      assertChildStates("list_reversal")
      commitChildren(node.child!)

      // shuffle(items)
      // reconcileChildFragment()
      // assertChildStates("list_randomization")
      // commitChildren(node.child!)
      // should not have any more delete calls yet
      assert.strictEqual(
        totalDeletions,
        i,
        `pre-removal: delete should have been called ${i} times`
      )

      items.splice(Math.floor(Math.random() * items.length), 1)
      reconcileChildFragment()
      assertChildStates("item_removal")
      commitChildren(node.child!)

      console.log("deleted", node.child!.deletions?.length)

      totalDeletions += node.child!.deletions!.length
      node.child!.deletions = []

      // should have called delete i + 1 times
      assert.strictEqual(
        totalDeletions,
        i + 1,
        `post-removal: delete should have been called ${i + 1} times`
      )
    }
  })
})
