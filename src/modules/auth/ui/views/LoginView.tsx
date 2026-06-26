import Link from "next/link"
import { AuthForm } from "../components/AuthForm"

export function LoginView() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-podium text-5xl uppercase tracking-wider text-white leading-[0.9]">
          Welcome<br /><span className="text-red-500">Back.</span>
        </h1>
        <p className="text-sm text-white/55 font-inter mt-3">
          Your documents are waiting.
        </p>
      </div>

      <AuthForm mode="login" />

      <p className="text-sm text-white/55 font-inter">
        No account?{" "}
        <Link href="/register" className="text-white hover:text-red-400 transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-red-400">
          Create one →
        </Link>
      </p>
    </div>
  )
}
