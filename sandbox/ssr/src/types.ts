import { SSRProps } from "kaioken/ssr"

export interface Product {
  id: number
  title: string
  description: string
  price: number
  discountPercentage: number
  rating: number
  stock: number
  brand: string
  category: string
  thumbnail: string
  images: string[]
}

export interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  gender: string
  image: string
  token: string
}

export interface PageProps extends SSRProps {
  request: {
    path: string
    query: string
  }
  data?: {
    product?: Product
  }
}
