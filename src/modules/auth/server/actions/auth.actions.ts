"use server"

import { auth } from "@/lib/auth"
import { APIError } from "better-auth/api"
import { redirect } from "next/navigation"
import { headers } from "next/headers"

export type AuthFormState = {
  error?: string
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    })
  } catch (err) {
    if (err instanceof APIError) {
      return { error: err.message }
    }
    return { error: "Invalid email or password" }
  }

  redirect("/dashboard")
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!name || !email || !password) {
    return { error: "All fields are required" }
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" }
  }

  try {
    await auth.api.signUpEmail({
      body: { name, email, password },
      headers: await headers(),
    })
  } catch (err) {
    if (err instanceof APIError) {
      return { error: err.message }
    }
    return { error: "Could not create account" }
  }

  redirect("/dashboard")
}
