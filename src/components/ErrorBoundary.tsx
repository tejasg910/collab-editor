"use client"

import { Component, type ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error)
  }

  reset = () => this.setState({ hasError: false, error: undefined })

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="w-10 h-10 rounded-full bg-raised flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-amber" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-parchment text-sm font-medium">
              Something went wrong
            </p>
            <p className="text-muted-foreground text-xs">
              {this.state.error?.message}
            </p>
          </div>
          <Button
            size="sm"
            onClick={this.reset}
            className="bg-signal hover:bg-signal/90 text-white"
          >
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
