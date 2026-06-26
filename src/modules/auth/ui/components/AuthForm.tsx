"use client"

import { useActionState, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { loginAction, registerAction, type AuthFormState } from "@/modules/auth/server/actions/auth.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

type Mode = "login" | "register"

const INITIAL_STATE: AuthFormState = {}

export function AuthForm({ mode }: { mode: Mode }) {
  const action = mode === "login" ? loginAction : registerAction
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    if (state.error) {
      setShake(true)
      const t = setTimeout(() => setShake(false), 500)
      return () => clearTimeout(t)
    }
  }, [state.error])

  return (
    <motion.form
      action={formAction}
      animate={shake ? { x: [-6, 6, -4, 4, -2, 2, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-5"
    >
      <AnimatePresence mode="wait">
        {mode === "register" && (
          <motion.div
            key="name-field"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2"
          >
            <Label
              htmlFor="name"
              className="text-white/60 text-xs tracking-widest uppercase font-inter"
            >
              Name
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Your name"
              required
              className="bg-white/[0.04] border border-white/10 hover:border-white/20 focus-visible:border-red-500 focus-visible:ring-0 text-white placeholder:text-white/40 h-11 font-inter rounded-none transition-colors"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="email"
          className="text-white/60 text-xs tracking-widest uppercase font-inter"
        >
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          className="bg-white/[0.04] border border-white/10 hover:border-white/20 focus-visible:border-red-500 focus-visible:ring-0 text-white placeholder:text-white/40 h-11 font-inter rounded-none transition-colors"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="password"
          className="text-white/60 text-xs tracking-widest uppercase font-inter"
        >
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          minLength={8}
          className="bg-white/[0.04] border border-white/10 hover:border-white/20 focus-visible:border-red-500 focus-visible:ring-0 text-white placeholder:text-white/40 h-11 font-inter rounded-none transition-colors"
        />
      </div>

      <AnimatePresence>
        {state.error && (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-sm text-destructive"
          >
            {state.error}
          </motion.p>
        )}
      </AnimatePresence>

      <Button
        type="submit"
        disabled={pending}
        className="h-11 bg-red-600 hover:bg-red-500 text-white font-inter text-xs tracking-widest uppercase transition-colors"
      >
        {pending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : mode === "register" ? (
          "Create account"
        ) : (
          "Sign in"
        )}
      </Button>
    </motion.form>
  )
}
