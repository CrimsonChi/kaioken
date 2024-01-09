import { useOptimistic, useRef, useState } from "reflex-ui"

type Message = {
  text: string
  sending?: boolean
}

async function deliverMessage(message: Message) {
  await new Promise((res) => setTimeout(res, 1000))
  return message
}

export function Messages() {
  const [messages, setMessages] = useState([
    { text: "Hello there!", sending: false },
  ] as Message[])

  async function sendMessage(formData: FormData) {
    const text = formData.get("message") as string
    const sentMessage = await deliverMessage({ text })
    setMessages((messages) => [...messages, { text: sentMessage.text }])
  }

  return <Thread messages={messages} sendMessage={sendMessage} />
}

function Thread({
  messages,
  sendMessage,
}: {
  messages: Message[]
  sendMessage: (formData: FormData) => Promise<void>
}) {
  const formRef = useRef<HTMLFormElement>(null)
  async function formAction(formData: FormData) {
    addOptimisticMessage(formData.get("message") as string)
    formRef.current?.reset()
    await sendMessage(formData)
  }
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage: string) => [
      ...state,
      {
        text: newMessage,
        sending: true,
      },
    ]
  )

  return (
    <>
      {optimisticMessages.map((message) => (
        <div>
          {message.text}
          {message.sending && (
            <>
              {" "}
              <small>Sending...</small>
            </>
          )}
        </div>
      ))}
      <form action={formAction} ref={formRef}>
        <input type="text" name="message" placeholder="Hello!" />
        <button type="submit">Send</button>
      </form>
    </>
  )
}
