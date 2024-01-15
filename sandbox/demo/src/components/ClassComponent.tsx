import { Component } from "kaioken"

interface Props {
  data: number
}

export class MyClassComponent extends Component<Props> {
  state = {
    count: 0,
  }
  constructor(props: Props) {
    super(props)
  }
  render() {
    return (
      <>
        <div>
          Hello from Class Component {this.props.data + this.state.count}
        </div>
        <button
          onclick={() => this.setState(({ count }) => ({ count: count + 1 }))}
        >
          +
        </button>
      </>
    )
  }
  componentDidUpdate(): void {
    console.log("componentDidUpdate")
  }
  componentDidMount(): void {
    console.log("componentDidMount")
  }
  componentWillUnmount(): void {
    console.log("componentWillUnmount")
  }
}
