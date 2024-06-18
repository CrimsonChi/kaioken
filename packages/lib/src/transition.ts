import { Component } from "./component.js"

type TransitionState = "entering" | "entered" | "exiting" | "exited"
type TransitionProps = {
  in: boolean
  timings?: [number, number]
  element: (state: "entering" | "entered" | "exiting" | "exited") => JSX.Element
  onAnimationEnd?: (state: "entered" | "exited") => void
}

export class Transition extends Component<TransitionProps> {
  defaultTimings = [20, 150]
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
    if (
      this.props.in &&
      this.state.transitionState !== "entered" &&
      this.state.transitionState !== "entering"
    ) {
      this.setTransitionState("entering")
      this.queueStateChange("entered")
    } else if (
      !this.props.in &&
      this.state.transitionState !== "exited" &&
      this.state.transitionState !== "exiting"
    ) {
      this.setTransitionState("exiting")
      this.queueStateChange("exited")
    }
  }

  setTransitionState(transitionState: TransitionState): void {
    this.clearTimeout()
    this.setState((prev) => ({
      ...prev,
      transitionState,
    }))

    if (
      (transitionState === "exited" || transitionState === "entered") &&
      this.props.onAnimationEnd
    ) {
      this.ctx.scheduler?.nextIdle(() =>
        this.props.onAnimationEnd!(transitionState)
      )
    }
  }

  getTiming(transitionState: "entered" | "exited"): number {
    const timings = this.props.timings ?? this.defaultTimings
    switch (transitionState) {
      case "entered":
        return timings[0]
      case "exited":
        return timings[1]
    }
  }

  queueStateChange(transitionState: "entered" | "exited"): void {
    this.state.timeoutRef = window.setTimeout(
      () => this.setTransitionState(transitionState),
      this.getTiming(transitionState)
    )
  }
}
