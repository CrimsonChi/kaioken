import { type AnyFormFieldContext, useForm } from "kaioken"

function FieldInfo({ field }: { field: AnyFormFieldContext }) {
  return (
    <div>
      {field.state.isTouched && field.state.errors.length ? (
        <em>{field.state.errors}</em>
      ) : null}
      {field.state.isValidating ? "Validating..." : null}
    </div>
  )
}

type Person = {
  name: string
  age: number
}

export default function UseFormExample() {
  const form = useForm({
    initialValues: {
      name: "",
      email: "",
      friends: [] as Person[],
    },
    onSubmit: ({ state }) => console.log("submit", state),
  })

  console.log("render UseFormExample")

  return (
    <form
      onsubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) =>
            !value
              ? "A first name is required"
              : value.length < 3
              ? "First name must be at least 3 characters"
              : undefined,
          onChangeAsyncDebounceMs: 500,
          onChangeAsync: async ({ value }) => {
            await new Promise((resolve) => setTimeout(resolve, 1000))
            return value.includes("error") && 'No "error" allowed in first name'
          },
        }}
        children={(field) => {
          return (
            <div className="flex">
              <label htmlFor={field.name}>First Name:</label>
              <input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onblur={field.handleBlur}
                oninput={(e) => field.handleChange(e.target.value)}
              />
              <FieldInfo field={field} />
            </div>
          )
        }}
      />
      <form.Field
        array
        name="friends"
        validators={{
          onChange: ({ value }) => {
            if (value.length < 2) {
              return "Must have at least 2 friends"
            }
          },
        }}
        children={(field) => (
          <div className="flex flex-col gap-2">
            <label htmlFor={field.name}>Friends:</label>
            <ul className="flex flex-col gap-2">
              {field.state.value.map((_, i) => (
                <form.Field
                  key={i}
                  name={`friends.${i}.name`}
                  children={(subField) => (
                    <li>
                      <input
                        id={subField.name}
                        name={subField.name}
                        value={subField.state.value}
                        onblur={field.handleBlur}
                        oninput={(e) => subField.handleChange(e.target.value)}
                      />
                      <button
                        type="button"
                        onclick={() => field.items.remove(i)}
                      >
                        Remove
                      </button>
                    </li>
                  )}
                />
              ))}
            </ul>
            <button
              type="button"
              onclick={() => field.items.push({ name: "", age: 42 })}
            >
              Add Friend
            </button>
            <FieldInfo field={field} />
          </div>
        )}
      />
      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        children={([canSubmit, isSubmitting]) => (
          <>
            <button
              className={canSubmit ? "bg-green-500" : "bg-red-500"}
              type="submit"
              disabled={!canSubmit}
            >
              {isSubmitting ? "..." : "Submit"}
            </button>
            <button type="reset" onclick={() => form.reset()}>
              Reset
            </button>
          </>
        )}
      />
    </form>
  )
}
