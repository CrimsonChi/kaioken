import { type AnyFormFieldContext, useForm } from "kaioken"

function FieldInfo({ field }: { field: AnyFormFieldContext }) {
  console.log("render FieldInfo", field)
  return (
    <>
      {field.state.isTouched && field.state.errors.length ? (
        <em>{field.state.errors.join(",")}</em>
      ) : null}
      {field.state.isValidating ? "Validating..." : null}
    </>
  )
}

export default function UseFormExample() {
  const form = useForm({
    initialValues: {
      name: "",
      email: "",
    },
    onSubmit: (state) => console.log("submit", state),
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
          console.log("render 'name'", field.state.errors)
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
      {/* <form.Field
        name="email"
        children={(field) => (
          <input
            type="email"
            name={field.name}
            value={field.state.value}
            onblur={field.handleBlur}
            oninput={(e) => field.handleChange(e.target.value)}
          />
        )}
      /> */}
      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        children={([canSubmit, isSubmitting]) => (
          <>
            <button type="submit" disabled={!canSubmit}>
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
