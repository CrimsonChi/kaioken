import dotenv from "dotenv"
dotenv.config()

type ValidatedObj<T> = {
  [P in keyof T]: T[P] extends string | undefined ? string : ValidatedObj<T[P]>
}

function validate<T>(obj: T, path: string = "", errors: string[] = []) {
  for (const key in obj) {
    const keyPath = (path.length > 0 ? path + "." : "") + key
    if (typeof obj[key] === "object") {
      validate(obj[key], keyPath, errors)
    } else if (obj[key] === undefined) {
      errors.push(keyPath)
    }
  }
  if (errors.length > 0) {
    throw new Error(`Missing env variables: ${errors.join(", ")}`)
  }
  return obj as ValidatedObj<T>
}

export const env = validate({
  server: {
    host: process.env.HOST || "localhost",
    port: Number(process.env.PORT || "5173"),
  },
  url: process.env.URL || "http://localhost:5173",
  domain: process.env.DOMAIN || "localhost",
  isProduction: process.env.NODE_ENV === "production",
  db: {
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
  auth0: {
    google: {
      id: process.env.GOOGLE_AUTH0_CLIENT_ID,
      secret: process.env.GOOGLE_AUTH0_CLIENT_SECRET,
    },
    github: {
      id: process.env.GITHUB_AUTH0_CLIENT_ID,
      secret: process.env.GITHUB_AUTH0_CLIENT_SECRET,
    },
  },
})
