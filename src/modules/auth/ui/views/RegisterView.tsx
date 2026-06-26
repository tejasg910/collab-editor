import Link from "next/link"
import { AuthForm } from "../components/AuthForm"

export function RegisterView() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-podium text-5xl uppercase tracking-wider text-white leading-[0.9]">
          Start<br /><span className="text-red-500">Writing.</span>
        </h1>
        <p className="text-sm text-white/55 font-inter mt-3">
          Free. Offline-first. Always yours.
        </p>
      </div>

      <AuthForm mode="register" />

      <p className="text-sm text-white/55 font-inter">
        Already have an account?{" "}
        <Link href="/login" className="text-white hover:text-red-400 transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-red-400">
          Sign in →
        </Link>
      </p>
    </div>
  )
}
