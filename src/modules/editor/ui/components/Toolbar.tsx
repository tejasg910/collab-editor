"use client"

import { useEditorState } from "@tiptap/react"
import type { Editor } from "@tiptap/react"
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Minus,
  Bookmark,
  Clock,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface ToolbarProps {
  editor: Editor | null
  editable: boolean
  onSaveVersion?: () => void
  onShowHistory?: () => void
  onToggleAI?: () => void
  aiOpen?: boolean
}

interface ToolButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolButton({ onClick, active, disabled, title, children }: ToolButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-7 h-7 transition-colors ${
        active
          ? "bg-red-500/20 text-red-400"
          : "text-white/60 hover:text-white hover:bg-white/[0.06]"
      }`}
    >
      {children}
    </Button>
  )
}

export function Toolbar({ editor, editable, onSaveVersion, onShowHistory, onToggleAI, aiOpen }: ToolbarProps) {
  // TipTap v3: useEditor no longer re-renders parent on every transaction.
  // useEditorState subscribes to specific editor state so this component
  // re-renders when undo/redo availability actually changes.
  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      canUndo: ctx.editor?.can().undo() ?? false,
      canRedo: ctx.editor?.can().redo() ?? false,
      isBold: ctx.editor?.isActive("bold") ?? false,
      isItalic: ctx.editor?.isActive("italic") ?? false,
      isStrike: ctx.editor?.isActive("strike") ?? false,
      isCode: ctx.editor?.isActive("code") ?? false,
      isH1: ctx.editor?.isActive("heading", { level: 1 }) ?? false,
      isH2: ctx.editor?.isActive("heading", { level: 2 }) ?? false,
      isBulletList: ctx.editor?.isActive("bulletList") ?? false,
      isOrderedList: ctx.editor?.isActive("orderedList") ?? false,
      isBlockquote: ctx.editor?.isActive("blockquote") ?? false,
    }),
  })

  if (!editor) return null

  const { canUndo, canRedo, isBold, isItalic, isStrike, isCode, isH1, isH2, isBulletList, isOrderedList, isBlockquote } = editorState ?? {}

  return (
    <div className="flex items-center gap-0.5 px-4 py-2 border-b border-white/[0.06] bg-[#0a0a0a] flex-wrap">
      {/* History */}
      <ToolButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editable || !canUndo}
        title="Undo"
      >
        <Undo className="w-3.5 h-3.5" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editable || !canRedo}
        title="Redo"
      >
        <Redo className="w-3.5 h-3.5" />
      </ToolButton>

      <Separator orientation="vertical" className="h-4 mx-1 bg-white/10" />

      {/* Headings */}
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={isH1}
        title="Heading 1"
      >
        <Heading1 className="w-3.5 h-3.5" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={isH2}
        title="Heading 2"
      >
        <Heading2 className="w-3.5 h-3.5" />
      </ToolButton>

      <Separator orientation="vertical" className="h-4 mx-1 bg-white/10" />

      {/* Marks */}
      <ToolButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={isBold}
        title="Bold"
      >
        <Bold className="w-3.5 h-3.5" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={isItalic}
        title="Italic"
      >
        <Italic className="w-3.5 h-3.5" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={isStrike}
        title="Strikethrough"
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={isCode}
        title="Inline code"
      >
        <Code className="w-3.5 h-3.5" />
      </ToolButton>

      <Separator orientation="vertical" className="h-4 mx-1 bg-white/10" />

      {/* Lists */}
      <ToolButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={isBulletList}
        title="Bullet list"
      >
        <List className="w-3.5 h-3.5" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={isOrderedList}
        title="Ordered list"
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={isBlockquote}
        title="Blockquote"
      >
        <Quote className="w-3.5 h-3.5" />
      </ToolButton>

      <Separator orientation="vertical" className="h-4 mx-1 bg-white/10" />

      {/* Misc */}
      <ToolButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        disabled={!editable}
        title="Divider"
      >
        <Minus className="w-3.5 h-3.5" />
      </ToolButton>

      {/* Right side controls */}
      <div className="ml-auto flex items-center gap-0.5">
        {onToggleAI && (
          <>
            <Separator orientation="vertical" className="h-4 mx-1 bg-white/10" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onToggleAI}
              title="AI Assistant"
              className={`w-7 h-7 transition-colors ${
                aiOpen
                  ? "bg-red-500/20 text-red-400"
                  : "text-white/60 hover:text-red-400 hover:bg-red-500/10"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
        <Separator orientation="vertical" className="h-4 mx-1 bg-white/10" />
        {onSaveVersion && (
          <ToolButton onClick={onSaveVersion} title="Save version">
            <Bookmark className="w-3.5 h-3.5" />
          </ToolButton>
        )}
        {onShowHistory && (
          <ToolButton onClick={onShowHistory} title="Version history">
            <Clock className="w-3.5 h-3.5" />
          </ToolButton>
        )}
      </div>
    </div>
  )
}
