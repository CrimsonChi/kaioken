import { Portal, useEffect, useOptimistic, useRef, useState } from "kaioken"

type Message = {
  message: string
  sending?: boolean
}

async function deliverMessage(message: Message) {
  await new Promise((res) => setTimeout(res, 1000))
  return message
}

export function Messages() {
  const [messages, setMessages] = useState([
    { message: "Hello there!", sending: false },
  ] as Message[])

  async function sendMessage(message: string) {
    const sentMessage = await deliverMessage({ message })
    setMessages((messages) => [...messages, { message: sentMessage.message }])
  }

  return <Thread messages={messages} sendMessage={sendMessage} />
}

function Thread({
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
        <input
          ref={inputRef}
          type="text"
          name="message"
          placeholder="Hello!"
          value={1}
        />
        <button type="submit">Send</button>
      </form>
      {optimisticMessages.length % 2 === 0 && (
        <Portal container={document.getElementById("portal-root")!}>
          <h2>Portal</h2>
        </Portal>
      )}
    </div>
  )
}
