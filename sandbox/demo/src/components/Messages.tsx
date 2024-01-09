import { useOptimistic, useRef, useState } from "kaioken"

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
    console.log("Sending message", text, formData)
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
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  function formAction(formData: FormData) {
    addOptimisticMessage(formData.get("message") as string)
    formRef.current?.reset()
    sendMessage(formData)
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
        <input ref={inputRef} type="text" name="message" placeholder="Hello!" />
        <button type="submit">Send</button>
      </form>
    </>
  )
}
