import { AppContext } from "./appContext.js"
import { Component } from "./component.js"
import { useAppContext } from "./hooks/utils.js"

export type TransitionState = "entering" | "entered" | "exiting" | "exited"
type TransitionProps = {
  in: boolean
  duration?:
    | number
    | {
        in: number
        out: number
      }
  element: (state: "entering" | "entered" | "exiting" | "exited") => JSX.Element
  onTransitionEnd?: (state: "entered" | "exited") => void
}

export class Transition extends Component<TransitionProps> {
  defaultDuration = 150
  state = {
    transitionState: "exited" as TransitionState,
    timeoutRef: null as number | null,
  }
  ctx: AppContext

  constructor(props: TransitionProps) {
    super(props)
    this.ctx = useAppContext(this.vNode)
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
      this.ctx.scheduler?.nextIdle(() => {
        this.setTransitionState("entering")
        this.queueStateChange("entered")
      })
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
      this.props.onTransitionEnd
    ) {
      this.ctx.scheduler?.nextIdle(() =>
        this.props.onTransitionEnd!(transitionState)
      )
    }
  }

  queueStateChange(transitionState: "entered" | "exited"): void {
    this.state.timeoutRef = window.setTimeout(
      () => this.setTransitionState(transitionState),
      this.getTiming(transitionState)
    )
  }

  getTiming(transitionState: "entered" | "exited"): number {
    if (typeof this.props.duration === "number") return this.props.duration
    switch (transitionState) {
      case "entered":
        return this.props.duration?.in ?? this.defaultDuration
      case "exited":
        return this.props.duration?.out ?? this.defaultDuration
    }
  }
}
