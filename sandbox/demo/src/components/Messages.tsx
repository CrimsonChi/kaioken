import { useEffect, useOptimistic, useRef, useState } from "kaioken"
import { Button } from "./atoms/Button"
import { Input } from "./atoms/Input"
import { useMessageStatsStore } from "../store"

type Message = {
  message: string
  sending?: boolean
}

async function deliverMessage(message: Message) {
  await new Promise((res) => setTimeout(res, 1000))
  const fail = Math.random() > 0.5
  if (fail) {
    useMessageStatsStore.setState((prev) => ({ ...prev, fail: prev.fail + 1 }))
    throw "teerasd"
  }
  useMessageStatsStore.setState((prev) => ({
    ...prev,
    success: prev.success + 1,
  }))
  return message
}

export function Messages() {
  const [messages, setMessages] = useState<Message[]>([])

  async function sendMessage(message: string) {
    const sentMessage = await deliverMessage({ message })
    setMessages((messages) => [...messages, sentMessage])
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
  const { success, fail } = useMessageStatsStore(({ value }) => value)

  function formAction(formData: FormData) {
    const message = formData.get("message") as string
    if (!message) return
    const revert = addOptimisticMessage(message)
    sendMessage(message).catch(revert)
  }

  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, message: string) => [...state, { message, sending: true }]
  )

  useEffect(() => inputRef.current?.focus())

  return (
    <div className="flex flex-col">
      <div>success: {success}</div>
      <div>fail: {fail}</div>
      <form
        autocomplete="off"
        action={formAction}
        ref={formRef}
        className="flex gap-2 mb-5"
      >
        <Input ref={inputRef} type="text" name="message" placeholder="Hello!" />
        <Button type="submit">Send</Button>
      </form>
      {optimisticMessages.map(({ message, sending }) => (
        <div className="text-center">
          {message}
          {sending && <small> Sending...</small>}
        </div>
      ))}
    </div>
  )
}
