import { PageProps } from "./types"
import { ProductView } from "./pages/Product"

export function App({ data }: PageProps) {
  return (
    <>
      <h1>Hello world!</h1>
      {data?.product && <ProductView data={data.product} />}
    </>
  )
}
