"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, MessageCircleQuestion, Timer } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookFilter from "@/components/BookFilter";
import HadithCard from "@/components/HadithCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { streamChat } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { BookSelection, ChatMessage, HadithResult } from "@/lib/types";

interface Turn {
  question: string;
  answer: string;
  sources: HadithResult[] | null; // null until the sources event arrives
  status: "streaming" | "done" | "error";
  error?: string;
  startedAt: number; // performance.now() at submit
  finishedAt?: number; // set when status leaves "streaming"
}

const EXAMPLES = [
  "What did the Prophet ﷺ say about anger?",
  "How should I treat my parents?",
  "What is the reward for patience?",
];

// Backend limits: 10 messages, 2000 chars each.
const HISTORY_TURNS = 4;
const MAX_CHARS = 2000;

// Shown in turn, 3s each, until the first words of the answer arrive. Describe only
// what is really happening; no unreferenced hadith quotes (attribution principle).
const STATUS = [
  "Searching the six books of hadith…",
  "Gathering narrations from Bukhari, Muslim and the Sunan…",
  "Reading the words of the Prophet ﷺ…",
  "Matching narrations to your question…",
  "Preparing an answer with its references…",
];
const STATUS_MS = 3000;
const HIGHLIGHT_MS = 2000;

const sourceLabel = (h: HadithResult) => `${h.collection_name ?? h.collection_id} ${h.hadith_number}`;

function clock(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

interface CiteProps {
  sources: HadithResult[];
  turn: number;
  onCite: (n: number) => void;
}

// The model is asked for plain paragraphs but some providers still send light markdown.
// Render just **bold**, "* "/"- " bullets and [n] citations; everything else is text.
// The model cites by number; we show the source's collection and hadith number instead.
function Inline({ text, sources, turn, onCite }: CiteProps & { text: string }) {
  return text.split(/(\*\*[^*]+\*\*|\[\d+\])/g).map((part, i) => {
    const cite = part.match(/^\[(\d+)\]$/);
    const n = cite ? +cite[1] : 0;
    if (n >= 1 && n <= sources.length) {
      return (
        <button
          key={i}
          type="button"
          onClick={() => onCite(n)}
          aria-controls={`t${turn}-sources`}
          className="mx-0.5 whitespace-nowrap rounded-md bg-primary-light px-1.5 py-0.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white focus-visible:outline-2 focus-visible:outline-ring"
        >
          {sourceLabel(sources[n - 1])}
        </button>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function Answer({ text, ...cite }: CiteProps & { text: string }) {
  const blocks: (string | string[])[] = [];
  for (const raw of text.trim().split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = line.match(/^[*-]\s+(.*)/);
    const last = blocks[blocks.length - 1];
    if (bullet && Array.isArray(last)) last.push(bullet[1]);
    else blocks.push(bullet ? [bullet[1]] : line);
  }
  return (
    <div className="flex flex-col gap-3 text-base leading-relaxed text-stone-800">
      {blocks.map((b, i) =>
        Array.isArray(b) ? (
          <ul key={i} className="ml-5 list-disc space-y-1">
            {b.map((item, j) => (
              <li key={j}>
                <Inline text={item} {...cite} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            <Inline text={b} {...cite} />
          </p>
        ),
      )}
    </div>
  );
}

export default function ChatPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<BookSelection | null>({
    collection_ids: null,
    book_ids: null,
  });
  const [openSources, setOpenSources] = useState<Set<number>>(new Set());
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const streaming = turns.at(-1)?.status === "streaming";

  useEffect(
    () => () => {
      abortRef.current?.abort();
      clearTimeout(highlightTimer.current);
    },
    [],
  );

  // Stopwatch tick; runs only while an answer is streaming.
  useEffect(() => {
    if (!streaming) return;
    const id = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(id);
  }, [streaming]);

  const updateTurn = (index: number, change: (t: Turn) => Partial<Turn>) =>
    setTurns((all) =>
      all.map((t, i) => {
        if (i !== index) return t;
        const next = { ...t, ...change(t) };
        if (next.status !== "streaming" && next.finishedAt === undefined) {
          next.finishedAt = performance.now();
        }
        return next;
      }),
    );

  const toggleSources = (turn: number, open: boolean) =>
    setOpenSources((prev) => {
      if (prev.has(turn) === open) return prev;
      const next = new Set(prev);
      if (open) next.add(turn);
      else next.delete(turn);
      return next;
    });

  // Open the turn's sources, bring the cited hadith into view, and tint it briefly.
  const cite = (turn: number, n: number) => {
    const id = `t${turn}-s${n}`;
    toggleSources(turn, true);
    setHighlighted(id);
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlighted(null), HIGHLIGHT_MS);
    // Next frame: React has rendered the opened <details>, so the card has a position.
    requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    });
  };

  const ask = async (question: string) => {
    question = question.trim().slice(0, MAX_CHARS);
    if (!question || !filter || streaming) return;

    const history: ChatMessage[] = turns
      .filter((t) => t.status === "done" && t.answer.trim())
      .slice(-HISTORY_TURNS)
      .flatMap((t) => [
        { role: "user" as const, content: t.question },
        { role: "assistant" as const, content: t.answer.trim().slice(0, MAX_CHARS) },
      ]);
    const index = turns.length;
    const startedAt = performance.now();
    setNow(startedAt);
    setTurns([...turns, { question, answer: "", sources: null, status: "streaming", startedAt }]);
    setInput("");

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamChat(
        [...history, { role: "user", content: question }],
        filter,
        (e) => {
          if (e.event === "sources") updateTurn(index, () => ({ sources: e.data.results }));
          else if (e.event === "delta") updateTurn(index, (t) => ({ answer: t.answer + e.data.text }));
          else if (e.event === "done") updateTurn(index, () => ({ status: "done" }));
          else updateTurn(index, () => ({ status: "error", error: e.data.message }));
        },
        controller.signal,
      );
      // Stream closed without done/error (e.g. connection dropped).
      updateTurn(index, (t) =>
        t.status === "streaming"
          ? { status: "error", error: "The answer was cut off. Please try again." }
          : {},
      );
    } catch (err) {
      if (controller.signal.aborted) return;
      updateTurn(index, () => ({
        status: "error",
        error: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      }));
    }
  };

  const newChat = () => {
    abortRef.current?.abort();
    setTurns([]);
    setOpenSources(new Set());
  };

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Ask about the Sunnah
            </h1>
            <p className="mt-2 text-stone-500">
              Ask in your own words. Answers are drawn only from cited hadith.
            </p>
          </div>

          <div className="mb-6 rounded-lg border border-primary/20 bg-primary-light/50 p-4 text-center">
            <p className="text-sm text-stone-600">
              <strong className="text-primary">Ask</strong> finds the most relevant hadith
              in the six books, then an AI summarises what they say, citing each one.
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Answers are AI-generated and may contain mistakes. They are not religious
              rulings. Always read the cited hadith, and consult a scholar for rulings.
              Want the hadith alone?{" "}
              <Link href="/search" className="underline text-primary hover:text-primary/80">
                Use Search
              </Link>
              .
            </p>
          </div>

          <div className="mb-4">
            <BookFilter onChange={setFilter} />
          </div>

          <div className="flex flex-col gap-10">
            {turns.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-white/50 p-8 text-center">
                <p className="text-stone-500">Try asking:</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {EXAMPLES.map((q) => (
                    <Button
                      key={q}
                      variant="outline"
                      size="sm"
                      disabled={!filter}
                      onClick={() => ask(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {turns.map((t, ti) => (
              <section key={ti} aria-label={`Question ${ti + 1}`} className="flex flex-col gap-4">
                <h2 className="flex items-start gap-2 text-lg font-semibold text-stone-800">
                  <MessageCircleQuestion className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  {t.question}
                </h2>

                {t.sources && t.sources.length > 0 && (
                  <details
                    id={`t${ti}-sources`}
                    open={openSources.has(ti)}
                    onToggle={(e) => toggleSources(ti, e.currentTarget.open)}
                    className="group rounded-xl border border-border bg-white/60"
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-stone-600 transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
                      <ChevronRight className="h-4 w-4 text-primary group-open:rotate-90" aria-hidden />
                      {t.sources.length} hadith used as sources
                    </summary>
                    <div className="flex flex-col gap-4 px-4 pb-4">
                      {t.sources.map((h, si) => {
                        const id = `t${ti}-s${si + 1}`;
                        return (
                          <div
                            key={h.id}
                            id={id}
                            className={cn(
                              "-m-1 rounded-xl p-1 transition-[background-color,box-shadow] duration-700",
                              highlighted === id && "bg-primary-light ring-2 ring-primary",
                            )}
                          >
                            <HadithCard hadith={h} />
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}
                {t.sources && t.sources.length === 0 && (
                  <p className="text-sm text-stone-500">No hadith matched in the selected books.</p>
                )}

                <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3 text-sm text-stone-500">
                    <span>
                      {t.status === "streaming" && !t.answer
                        ? STATUS[Math.floor(Math.max(0, now - t.startedAt) / STATUS_MS) % STATUS.length]
                        : "Answer"}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 tabular-nums text-stone-400">
                      <Timer className="h-4 w-4" aria-hidden />
                      {t.finishedAt === undefined
                        ? clock(Math.max(0, now - t.startedAt))
                        : `${t.status === "done" ? "Answered in" : "Stopped after"} ${((t.finishedAt - t.startedAt) / 1000).toFixed(1)}s`}
                    </span>
                  </div>
                  {/* aria-busy holds the live-region announcement until the answer finishes streaming. */}
                  <div aria-live="polite" aria-busy={t.status === "streaming"}>
                    {t.answer && (
                      <Answer
                        text={t.answer}
                        sources={t.sources ?? []}
                        turn={ti}
                        onCite={(n) => cite(ti, n)}
                      />
                    )}
                    {t.status === "error" && (
                      <p className={cn("text-sm text-red-600", t.answer && "mt-3")}>{t.error}</p>
                    )}
                  </div>
                </div>
              </section>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="sticky bottom-4 mt-10 flex gap-3 rounded-lg border border-border bg-background/90 p-3 shadow-sm backdrop-blur-sm"
          >
            <Input
              name="question"
              aria-label="Your question"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={turns.length ? "Ask a follow-up…" : "Ask a question…"}
              maxLength={MAX_CHARS}
              disabled={streaming}
            />
            <Button type="submit" disabled={streaming || !filter || !input.trim()}>
              Ask
            </Button>
            {turns.length > 0 && (
              <Button type="button" variant="ghost" onClick={newChat}>
                New
              </Button>
            )}
          </form>
          {!filter && (
            <p className="mt-2 text-center text-sm text-stone-500">
              Select at least one book to ask a question.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
