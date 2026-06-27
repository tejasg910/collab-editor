"use client"

import { Node, mergeAttributes } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react"
import type { NodeViewProps, JSONContent } from "@tiptap/react"

/** Flatten a TipTap block node to plain text for preview */
function blockText(block: JSONContent | null): string {
  if (!block) return ""
  if (block.type === "text") return block.text ?? ""
  if (block.content) return block.content.map(blockText).join("")
  return ""
}

function ConflictNodeView({ node, editor, getPos }: NodeViewProps) {
  const localBlock  = node.attrs.localBlock  as JSONContent | null
  const remoteBlock = node.attrs.remoteBlock as JSONContent | null

  function resolve(chosen: JSONContent) {
    const pos = typeof getPos === "function" ? getPos() : null
    if (pos === null || pos === undefined) return
    try {
      const chosenNode = editor.schema.nodeFromJSON(chosen)
      editor.view.dispatch(
        editor.state.tr.replaceWith(pos, pos + node.nodeSize, chosenNode)
      )
    } catch {
      editor.view.dispatch(editor.state.tr.delete(pos, pos + node.nodeSize))
    }
  }

  const localText  = blockText(localBlock)  || "(empty)"
  const remoteText = blockText(remoteBlock) || "(empty)"

  return (
    <NodeViewWrapper contentEditable={false} data-type="conflict-block">
      <div className="my-1 border border-amber-400/50 rounded overflow-hidden text-sm select-none">
        <div className="flex items-center gap-2 px-3 py-1 bg-amber-400/10 border-b border-amber-400/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          <span className="text-xs text-amber-300 font-medium">Conflict</span>
          <span className="text-xs text-white/40">both users edited this block</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-amber-400/20">
          <div className="p-3 space-y-2">
            <p className="text-[11px] text-white/40 uppercase tracking-wide">Your version</p>
            <p className="text-white/80 text-sm leading-relaxed">{localText}</p>
            <button
              onClick={() => localBlock && resolve(localBlock)}
              className="text-[11px] px-2.5 py-0.5 border border-white/20 rounded hover:border-amber-400/60 hover:text-amber-300 text-white/50 transition-colors"
            >
              Keep mine
            </button>
          </div>
          <div className="p-3 space-y-2">
            <p className="text-[11px] text-white/40 uppercase tracking-wide">Their version</p>
            <p className="text-white/80 text-sm leading-relaxed">{remoteText}</p>
            <button
              onClick={() => remoteBlock && resolve(remoteBlock)}
              className="text-[11px] px-2.5 py-0.5 border border-white/20 rounded hover:border-amber-400/60 hover:text-amber-300 text-white/50 transition-colors"
            >
              Keep theirs
            </button>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export const ConflictBlockExtension = Node.create({
  name: "conflictBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      localBlock: {
        default: null,
        parseHTML: (el) => {
          try { return JSON.parse(el.getAttribute("data-local") ?? "null") } catch { return null }
        },
        renderHTML: (attrs) => ({ "data-local": JSON.stringify(attrs.localBlock) }),
      },
      remoteBlock: {
        default: null,
        parseHTML: (el) => {
          try { return JSON.parse(el.getAttribute("data-remote") ?? "null") } catch { return null }
        },
        renderHTML: (attrs) => ({ "data-remote": JSON.stringify(attrs.remoteBlock) }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="conflict-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "conflict-block" })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ConflictNodeView)
  },
})
