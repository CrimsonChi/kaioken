const parentStack = [] as Array<HTMLElement | SVGElement | Text>
const childIdxStack = [] as Array<number>

export const hydrationStack = {
  clear: () => {
    parentStack.length = 0
    childIdxStack.length = 0
  },
  pop: () => {
    parentStack.pop()
    childIdxStack.pop()
  },
  push: (el: HTMLElement | SVGElement | Text) => {
    parentStack.push(el)
    childIdxStack.push(0)
  },
  nextChild: () => {
    return parentStack[parentStack.length - 1].childNodes[
      childIdxStack[childIdxStack.length - 1]++
    ] as HTMLElement | SVGElement | Text | undefined
  },
}
