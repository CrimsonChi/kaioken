import { useEffect, useOptimistic, useRef, useState } from "kaioken"

type Message = {
  message: string
  sending?: boolean
}

async function deliverMessage(message: Message) {
  await new Promise((res) => setTimeout(res, 1000))
  return message
}

function _Messages() {
  const [messages, setMessages] = useState([
    { message: "Hello there!", sending: false },
  ] as Message[])

  async function sendMessage(message: string) {
    const sentMessage = await deliverMessage({ message })
    setMessages((messages) => [...messages, { message: sentMessage.message }])
  }

  return <Thread messages={messages} sendMessage={sendMessage} />
}

export const Messages = Object.assign(_Messages, {
  // test: true,
})

function _Thread({
  messages,
  sendMessage,
}: {
  messages: Message[]
  sendMessage: (message: string) => Promise<void>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  function formAction(formData: FormData) {
    const message = formData.get("message") as string
    formRef.current?.reset()
    sendMessage(message)
    addOptimisticMessage(message)
  }
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, message: string) => [...state, { message, sending: true }]
  )

  useEffect(() => {
    inputRef.current?.focus()
  })

  return (
    <div>
      {optimisticMessages.map(({ message, sending }) => (
        <div>
          {message}
          {sending && <small> Sending...</small>}
        </div>
      ))}

      <form action={formAction} ref={formRef}>
        <input ref={inputRef} type="text" name="message" placeholder="Hello!" />
        <button type="submit">Send</button>
      </form>
    </div>
  )
}

const Thread = Object.assign(_Thread, {
  test: true,
})