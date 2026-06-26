"use client"

import { EditorContent } from "@tiptap/react"
import type { Editor as TipTapEditor } from "@tiptap/react"

interface EditorProps {
  editor: TipTapEditor | null
}

export function Editor({ editor }: EditorProps) {
  return (
    <div className="h-full">
      <EditorContent
        editor={editor}
        className="h-full prose prose-invert max-w-none focus:outline-none
          [&_.ProseMirror]:h-full
          [&_.ProseMirror]:outline-none
          [&_.ProseMirror]:text-parchment
          [&_.ProseMirror]:text-base
          [&_.ProseMirror]:leading-relaxed
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-white/30
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0
          [&_.ProseMirror_h1]:font-[family-name:var(--font-display)]
          [&_.ProseMirror_h1]:text-3xl
          [&_.ProseMirror_h1]:text-parchment
          [&_.ProseMirror_h1]:font-normal
          [&_.ProseMirror_h1]:mb-4
          [&_.ProseMirror_h2]:text-xl
          [&_.ProseMirror_h2]:text-parchment
          [&_.ProseMirror_h2]:font-semibold
          [&_.ProseMirror_h2]:mb-3
          [&_.ProseMirror_h3]:text-lg
          [&_.ProseMirror_h3]:text-parchment
          [&_.ProseMirror_h3]:font-semibold
          [&_.ProseMirror_h3]:mb-2
          [&_.ProseMirror_code]:bg-raised
          [&_.ProseMirror_code]:text-confirmed
          [&_.ProseMirror_code]:px-1.5
          [&_.ProseMirror_code]:py-0.5
          [&_.ProseMirror_code]:rounded
          [&_.ProseMirror_code]:text-sm
          [&_.ProseMirror_pre]:bg-raised
          [&_.ProseMirror_pre]:rounded-xl
          [&_.ProseMirror_pre]:p-4
          [&_.ProseMirror_pre]:my-4
          [&_.ProseMirror_blockquote]:border-l-2
          [&_.ProseMirror_blockquote]:border-white/20
          [&_.ProseMirror_blockquote]:pl-4
          [&_.ProseMirror_blockquote]:text-white/60
          [&_.ProseMirror_ul]:list-disc
          [&_.ProseMirror_ul]:pl-5
          [&_.ProseMirror_ol]:list-decimal
          [&_.ProseMirror_ol]:pl-5
          [&_.ProseMirror_li]:mb-1"
      />
    </div>
  )
}
