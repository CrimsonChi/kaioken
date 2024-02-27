import { Component } from "./component.js"

export type TransitionState = "entering" | "entered" | "exiting" | "exited"
type TransitionProps = {
  in: boolean
  timings?: [number, number, number, number]
  element: (state: "entering" | "entered" | "exiting" | "exited") => JSX.Element
}

export class Transition extends Component<TransitionProps> {
  state = {
    transitionState: "exited" as TransitionState,
    timeoutRef: null as number | null,
  }

  render(): JSX.Element {
    return this.props.element(this.state.transitionState)
  }

  clearTimeout(): void {
    if (this.state.timeoutRef) clearTimeout(this.state.timeoutRef)
    this.state.timeoutRef = null
  }

  componentWillUnmount(): void {
    this.clearTimeout()
  }

  componentDidMount(): void {
    if (this.props.in) {
      this.setTransitionState("entering")
      this.queueStateChange("entered")
    }
  }
  componentDidUpdate(): void {
    if (this.props.in && this.state.transitionState === "exited") {
      this.setTransitionState("entering")
      this.queueStateChange("entered")
    } else if (!this.props.in && this.state.transitionState === "entered") {
      this.setTransitionState("exiting")
      this.queueStateChange("exited")
    }
  }

  setTransitionState(transitionState: TransitionState): void {
    this.setState((prev) => ({
      ...prev,
      transitionState,
    }))
  }

  getTiming(): number {
    const timings = this.props.timings ?? [0, 0, 0, 0]
    switch (this.state.transitionState) {
      case "entering":
        return timings[0]
      case "entered":
        return timings[1]
      case "exiting":
        return timings[2]
      case "exited":
        return timings[3]
    }
  }

  queueStateChange(transitionState: TransitionState): void {
    this.state.timeoutRef = window.setTimeout(() => {
      this.clearTimeout()
      this.setState((prev) => ({
        ...prev,
        transitionState,
      }))
    }, this.getTiming())
  }
}
