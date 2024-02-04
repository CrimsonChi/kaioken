import { Product, User } from "./types"

async function req(url: string, opts?: RequestInit) {
  const response = await fetch(url, opts)
  const data = await response.json()
  if (!response.ok) throw new Error(data?.message ?? response.statusText)
  return data
}

export function loadProducts(): Promise<Product[]> {
  return req("https://dummyjson.com/products")
}

export function loadProduct(id: string): Promise<Product> {
  return req(`https://dummyjson.com/products/${id}`)
}

export function login({
  username,
  password,
}: {
  username: string
  password: string
}): Promise<User> {
  return req("https://dummyjson.com/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      password,
      expiresInMins: 5,
    }),
  })
}

export function getAuth(token: string) {
  return req("https://dummyjson.com/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}
