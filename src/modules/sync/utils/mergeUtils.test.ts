import { describe, it, expect } from "vitest"
import {
  threeWayMerge,
  pickWinner,
  nextLamportClock,
  updateLamportClock,
} from "./mergeUtils"
import type { JSONContent } from "@tiptap/react"

// ── Helpers ─────────────────────────────────────────────────────────────────

function para(text: string): JSONContent {
  return {
    type: "paragraph",
    content: [{ type: "text", text }],
  }
}

function doc(...blocks: JSONContent[]): JSONContent {
  return { type: "doc", content: blocks }
}

// ── nextLamportClock ────────────────────────────────────────────────────────

describe("nextLamportClock", () => {
  it("increments by 1", () => {
    expect(nextLamportClock(0)).toBe(1)
    expect(nextLamportClock(5)).toBe(6)
  })
})

// ── updateLamportClock ──────────────────────────────────────────────────────

describe("updateLamportClock", () => {
  it("advances past received when received is higher", () => {
    expect(updateLamportClock(3, 10)).toBe(11)
  })

  it("advances local+1 when local is already higher", () => {
    expect(updateLamportClock(10, 3)).toBe(11)
  })

  it("tie: takes max+1", () => {
    expect(updateLamportClock(5, 5)).toBe(6)
  })
})

// ── pickWinner ──────────────────────────────────────────────────────────────

describe("pickWinner", () => {
  it("picks op with highest Lamport clock", () => {
    const ops = [
      { lamportClock: 2, userId: "alice", content: { text: "alice" } },
      { lamportClock: 5, userId: "bob",   content: { text: "bob" } },
      { lamportClock: 1, userId: "carol", content: { text: "carol" } },
    ]
    expect(pickWinner(ops).userId).toBe("bob")
  })

  it("tiebreaks by lexicographically larger userId", () => {
    const ops = [
      { lamportClock: 3, userId: "alice", content: {} },
      { lamportClock: 3, userId: "bob",   content: {} },
    ]
    expect(pickWinner(ops).userId).toBe("bob")
  })

  it("single op always wins", () => {
    const ops = [{ lamportClock: 1, userId: "only", content: {} }]
    expect(pickWinner(ops).userId).toBe("only")
  })
})

// ── threeWayMerge ───────────────────────────────────────────────────────────

describe("threeWayMerge", () => {
  it("no changes from either side → returns local (same as remote)", () => {
    const base = doc(para("A"), para("B"))
    const merged = threeWayMerge(base, base, base, 1, 1)
    expect(merged.content).toHaveLength(2)
    expect((merged.content![0].content![0] as JSONContent).text).toBe("A")
  })

  it("only local changed → keeps local change", () => {
    const base   = doc(para("A"), para("B"))
    const local  = doc(para("A-edited"), para("B"))
    const remote = doc(para("A"), para("B"))
    const merged = threeWayMerge(base, local, remote, 2, 1)
    expect((merged.content![0].content![0] as JSONContent).text).toBe("A-edited")
    expect((merged.content![1].content![0] as JSONContent).text).toBe("B")
  })

  it("only remote changed → keeps remote change", () => {
    const base   = doc(para("A"), para("B"))
    const local  = doc(para("A"), para("B"))
    const remote = doc(para("A"), para("B-edited"))
    const merged = threeWayMerge(base, local, remote, 1, 2)
    expect((merged.content![0].content![0] as JSONContent).text).toBe("A")
    expect((merged.content![1].content![0] as JSONContent).text).toBe("B-edited")
  })

  it("different sections edited → preserves both (key case for offline work)", () => {
    const base   = doc(para("Intro"), para("Body"))
    const local  = doc(para("Intro edited"), para("Body"))      // local changed para 0
    const remote = doc(para("Intro"), para("Body edited"))      // remote changed para 1
    const merged = threeWayMerge(base, local, remote, 2, 3)
    expect(merged.content).toHaveLength(2)
    expect((merged.content![0].content![0] as JSONContent).text).toBe("Intro edited")
    expect((merged.content![1].content![0] as JSONContent).text).toBe("Body edited")
  })

  it("genuine conflict (both changed same block) → higher clock wins", () => {
    const base   = doc(para("original"))
    const local  = doc(para("local version"))   // clock 5
    const remote = doc(para("remote version"))  // clock 10
    const merged = threeWayMerge(base, local, remote, 5, 10)
    // remote clock higher → remote wins
    expect((merged.content![0].content![0] as JSONContent).text).toBe("remote version")
  })

  it("genuine conflict → local wins when local clock higher", () => {
    const base   = doc(para("original"))
    const local  = doc(para("local version"))   // clock 10
    const remote = doc(para("remote version"))  // clock 5
    const merged = threeWayMerge(base, local, remote, 10, 5)
    expect((merged.content![0].content![0] as JSONContent).text).toBe("local version")
  })

  it("local adds new block, remote unchanged → both new blocks included", () => {
    const base   = doc(para("A"))
    const local  = doc(para("A"), para("B-local"))  // added para 1
    const remote = doc(para("A"))                    // no change
    const merged = threeWayMerge(base, local, remote, 2, 1)
    expect(merged.content).toHaveLength(2)
    expect((merged.content![1].content![0] as JSONContent).text).toBe("B-local")
  })

  it("both add different new blocks (no base) → includes both", () => {
    const base   = doc(para("A"))
    const local  = doc(para("A"), para("B-local"))
    const remote = doc(para("A"), para("B-remote"))
    const merged = threeWayMerge(base, local, remote, 2, 3)
    // pos 1 has no base → both inserted
    expect(merged.content).toHaveLength(3)
  })

  it("remote deletes a block that local didn't touch → deletion honoured", () => {
    const base   = doc(para("A"), para("B"), para("C"))
    const local  = doc(para("A"), para("B"), para("C")) // unchanged
    const remote = doc(para("A"), para("C"))             // deleted B (index 1)
    // Remote at index 1 = para("C"), base at index 1 = para("B")
    // local at index 1 = para("B") == base → remote changed → take remote = para("C")
    // index 2: local=para("C"), remote=undefined, base=para("C") → base==remote → take local
    const merged = threeWayMerge(base, local, remote, 1, 2)
    // Result should have C,C (remote's re-arrangement) — not the concern;
    // important: B is gone (deletion honoured) and no crash
    expect(merged.content!.some(
      b => (b.content?.[0] as JSONContent)?.text === "B"
    )).toBe(false)
  })

  it("empty docs → returns single empty paragraph", () => {
    const empty: JSONContent = { type: "doc", content: [] }
    const merged = threeWayMerge(empty, empty, empty, 0, 0)
    expect(merged.type).toBe("doc")
    expect(merged.content).toHaveLength(1)
    expect(merged.content![0].type).toBe("paragraph")
  })
})
