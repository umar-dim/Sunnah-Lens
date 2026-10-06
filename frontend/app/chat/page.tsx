"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, ChevronRight, MessageCircleQuestion, RefreshCw, RotateCcw, Timer } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookFilter from "@/components/BookFilter";
import HadithCard from "@/components/HadithCard";
import { honorifics } from "@/components/Honorific";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { streamChat } from "@/lib/api";
import { SUGGESTED_QUESTIONS } from "@/lib/questions";
import { cn } from "@/lib/utils";
import type { BookSelection, ChatMessage, HadithResult } from "@/lib/types";

interface Turn {
  question: string;
  answer: string;
  sources: HadithResult[] | null; // null until the sources event arrives
  status: "streaming" | "done" | "error" | "stopped";
  error?: string;
  startedAt: number; // performance.now() at submit
  finishedAt?: number; // set when status leaves "streaming"
}

// Three distinct suggestions in random order, never repeating the ones on screen.
function pickQuestions(exclude: string[] = []): string[] {
  const pool = SUGGESTED_QUESTIONS.filter((q) => !exclude.includes(q));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

// Backend limits: 10 messages, 2000 chars each.
const HISTORY_TURNS = 4;
const MAX_CHARS = 2000;

// The model replies with exactly this when the hadith don't answer the question.
const NOT_COVERED = "NOT_COVERED";
const isNotCovered = (answer: string) => /^NOT_COVERED\W*$/.test(answer.trim());
// While streaming, hold back text that could still turn out to be NOT_COVERED.
const mightBeNotCovered = (answer: string) => NOT_COVERED.startsWith(answer.trim());

// Shown in turn, 3s each, until the first words of the answer arrive. Describe only
// what is really happening; no unreferenced hadith quotes (attribution principle).
const SEARCHING = [
  "Searching the six books of hadith…",
  "Looking through all six collections…",
];
const WRITING = [
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

// Source numbers the answer actually cites, in first-cited order.
function citedNumbers(answer: string, count: number): number[] {
  const seen = new Set<number>();
  for (const m of answer.matchAll(/\[(\d+)\]/g)) {
    const n = +m[1];
    if (n >= 1 && n <= count) seen.add(n);
  }
  return [...seen];
}

function statusLine(t: Turn, elapsed: number) {
  const step = Math.floor(elapsed / STATUS_MS);
  if (!t.sources) return SEARCHING[step % SEARCHING.length];
  const books = new Set(t.sources.map((h) => h.collection_id)).size;
  const found = `Found ${t.sources.length} hadith in ${books} ${books === 1 ? "collection" : "collections"}…`;
  // Lead with what was found, then rotate through the writing steps.
  return step === 0 ? found : WRITING[(step - 1) % WRITING.length];
}

interface CiteProps {
  sources: HadithResult[];
  turn: number;
  expanded: boolean;
  onCite: (n: number) => void;
}

// The model is asked for plain paragraphs but some providers still send light markdown.
// Render just **bold**, "* "/"- " bullets and [n] citations; everything else is text.
// The model cites by number; we show the source's collection and hadith number instead.
function Inline({ text, sources, turn, expanded, onCite }: CiteProps & { text: string }) {
  // Glue citations to the punctuation after them so "angry [1] ." reads "angry [1]."
  const tidy = text.replace(/\]\s+(?=[.,;:!?)])/g, "]");
  return tidy.split(/(\*\*[^*]+\*\*|(?:\[\d+\]\s*)+[.,;:!?)]?)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{honorifics(part.slice(2, -2))}</strong>;
    }
    const nums = [...part.matchAll(/\[(\d+)\]/g)].map((m) => +m[1]);
    if (!nums.length) return <span key={i}>{honorifics(part)}</span>;
    const punct = part.trimEnd().endsWith("]") ? "" : part.trimEnd().slice(-1);
    return (
      // A citation never wraps away from its sentence's closing punctuation.
      <span key={i} className="whitespace-nowrap">
        {nums.map((n, j) =>
          n >= 1 && n <= sources.length ? (
            <button
              key={j}
              type="button"
              onClick={() => onCite(n)}
              aria-controls={`t${turn}-sources`}
              aria-expanded={expanded}
              aria-label={`Source: ${sourceLabel(sources[n - 1])}, show hadith`}
              className="ml-1 rounded-md bg-primary-light px-1.5 py-0.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {sourceLabel(sources[n - 1])}
            </button>
          ) : (
            <span key={j}>[{n}]</span>
          ),
        )}
        {punct}
      </span>
    );
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

function NotCovered({ onRephrase }: { onRephrase: () => void }) {
  return (
    <div className="text-base leading-relaxed text-stone-800">
      <p>We couldn&apos;t find a hadith in the six books that answers this directly.</p>
      <ul className="mt-3 flex flex-col gap-1.5 text-sm text-stone-600">
        <li>
          <button
            type="button"
            onClick={onRephrase}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Ask it in different words
          </button>
          , for example naming the topic rather than the situation.
        </li>
        <li>
          <Link href="/search" className="font-medium text-primary underline-offset-4 hover:underline">
            Search the hadith yourself
          </Link>{" "}
          to read the narrations that come closest.
        </li>
        <li>For rulings on what is allowed, ask a qualified scholar.</li>
      </ul>
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
  const [lastCited, setLastCited] = useState<string | null>(null); // card showing "Back to answer"
  const [now, setNow] = useState(0);
  // Empty until mount: picking during the server render would mismatch on hydration.
  const [examples, setExamples] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const streaming = turns.at(-1)?.status === "streaming";

  useEffect(
    () => () => {
      abortRef.current?.abort();
      clearTimeout(highlightTimer.current);
    },
    [],
  );

  useEffect(() => setExamples(pickQuestions()), []);

  // Stopwatch tick; runs only while an answer is streaming.
  useEffect(() => {
    if (!streaming) return;
    const id = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(id);
  }, [streaming]);

  const scrollBehavior = (): ScrollBehavior =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

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

  // Open the turn's sources, bring the cited hadith into view, focus it and tint it briefly.
  const cite = (turn: number, n: number) => {
    const id = `t${turn}-s${n}`;
    toggleSources(turn, true);
    setHighlighted(id);
    setLastCited(id);
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlighted(null), HIGHLIGHT_MS);
    // Next frame: React has rendered the opened <details>, so the card has a position.
    requestAnimationFrame(() => {
      const card = document.getElementById(id);
      card?.focus({ preventScroll: true });
      card?.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
    });
  };

  const backToAnswer = (turn: number) => {
    setLastCited(null);
    const answer = document.getElementById(`t${turn}-answer`);
    answer?.focus({ preventScroll: true });
    answer?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  };

  const ask = async (raw: string, retry = false) => {
    const question = raw.trim().slice(0, MAX_CHARS);
    if (!question || !filter || streaming) return;

    // A retry replaces the failed or stopped last turn instead of stacking another.
    const kept = retry ? turns.slice(0, -1) : turns;
    const history: ChatMessage[] = kept
      .filter((t) => t.status === "done" && t.answer.trim() && !isNotCovered(t.answer))
      .slice(-HISTORY_TURNS)
      .flatMap((t) => [
        { role: "user" as const, content: t.question },
        { role: "assistant" as const, content: t.answer.trim().slice(0, MAX_CHARS) },
      ]);
    const index = kept.length;
    const startedAt = performance.now();
    setNow(startedAt);
    setTurns([...kept, { question, answer: "", sources: null, status: "streaming", startedAt }]);
    setOpenSources((prev) => new Set([...prev].filter((t) => t < index)));
    setInput("");
    requestAnimationFrame(() =>
      document.getElementById(`turn-${index}`)?.scrollIntoView({ behavior: scrollBehavior(), block: "start" }),
    );

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
          ? { status: "error", error: "The answer was cut off before it finished." }
          : {},
      );
    } catch (err) {
      if (controller.signal.aborted) return;
      updateTurn(index, () => ({
        status: "error",
        error: err instanceof Error ? err.message : "Something went wrong.",
      }));
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    updateTurn(turns.length - 1, (t) => (t.status === "streaming" ? { status: "stopped" } : {}));
  };

  const newChat = () => {
    if (turns.length > 1 && !window.confirm("Start a new conversation? This clears every answer on the page.")) {
      return;
    }
    abortRef.current?.abort();
    setTurns([]);
    setOpenSources(new Set());
    setLastCited(null);
    inputRef.current?.focus();
  };

  const rephrase = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
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

          <div className="mb-6 rounded-lg border border-primary/20 bg-primary-light/50 p-4">
            <p className="text-sm text-stone-600">
              <strong className="text-primary">Ask</strong> answers in a few sentences, using only
              hadith from the six books, and names every one it draws on.
            </p>
            <p className="mt-1 text-sm text-stone-600">
              Its only source is the hadith in these books. It doesn&apos;t draw on the Quran,
              tafsir, scholars&apos; opinions or other hadith collections, so if the six books
              don&apos;t cover your question, it will say so.
            </p>
            <p className="mt-1 text-sm text-stone-600">
              Answers are written by AI and can be wrong. They are not religious rulings: read
              the cited hadith, and ask a qualified scholar about rulings. To browse matching
              hadith yourself, use{" "}
              <Link href="/search" className="font-medium text-primary underline underline-offset-4 hover:text-primary-deep">
                Search
              </Link>
              .
            </p>
          </div>

          <div className="mb-4">
            <BookFilter onChange={setFilter} />
          </div>

          {turns.length === 0 && (
            <div className="mt-6 text-center">
              <div className="flex items-center justify-center gap-1">
                <p className="text-sm text-stone-500">Try asking</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setExamples((shown) => pickQuestions(shown))}
                  aria-label="Show different suggested questions"
                  className="h-8 px-2"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  Other questions
                </Button>
              </div>
              {/* min-h holds the row's space until the questions are picked after mount. */}
              <div className="mt-2 flex min-h-20 flex-wrap content-start justify-center gap-2">
                {examples.map((q) => (
                  <Button key={q} variant="outline" size="sm" disabled={!filter} onClick={() => ask(q)}>
                    {/* One span: Button is a flex row, so a bare honorific span would get its gap. */}
                    <span>{honorifics(q)}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {turns.length > 0 && (
            <div className="mt-6 flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={newChat}>
                <RotateCcw className="h-4 w-4" aria-hidden />
                New conversation
              </Button>
            </div>
          )}

          <div className={cn("flex flex-col gap-12", turns.length > 0 && "mt-4")}>
            {turns.map((t, ti) => {
              const live = t.status === "streaming";
              const elapsed = Math.max(0, (t.finishedAt ?? now) - t.startedAt);
              const sources = t.sources ?? [];
              const notCovered = isNotCovered(t.answer);
              const visibleAnswer = live && mightBeNotCovered(t.answer) ? "" : notCovered ? "" : t.answer;
              const cited = notCovered ? [] : citedNumbers(t.answer, sources.length);
              const citedSet = new Set(cited);
              const groups = [
                { title: "Cited in the answer", items: cited },
                {
                  title: cited.length ? "Also found, not cited" : "Found",
                  items: sources.map((_, i) => i + 1).filter((n) => !citedSet.has(n)),
                },
              ].filter((g) => g.items.length);

              return (
                <section
                  key={ti}
                  id={`turn-${ti}`}
                  aria-label={`Question ${ti + 1}`}
                  className="flex scroll-mt-20 flex-col gap-4"
                >
                  <h2 className="flex items-start gap-2 text-lg font-semibold text-stone-800">
                    <MessageCircleQuestion className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <span>{honorifics(t.question)}</span>
                  </h2>

                  {sources.length > 0 && (
                    <details
                      id={`t${ti}-sources`}
                      open={openSources.has(ti)}
                      onToggle={(e) => toggleSources(ti, e.currentTarget.open)}
                      className="group rounded-xl border border-border bg-white/60"
                    >
                      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl px-4 py-3 text-sm text-stone-600 transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
                        <ChevronRight className="h-4 w-4 shrink-0 text-primary group-open:rotate-90" aria-hidden />
                        {cited.length > 0 ? (
                          <>
                            <span className="font-medium text-stone-700">Sources</span>
                            {cited.slice(0, 2).map((n) => (
                              <span
                                key={n}
                                className="rounded-md bg-primary-light px-1.5 py-0.5 text-xs font-semibold text-primary"
                              >
                                {sourceLabel(sources[n - 1])}
                              </span>
                            ))}
                            {cited.length > 2 && (
                              <span className="text-xs font-semibold text-primary">+{cited.length - 2}</span>
                            )}
                            <span className="ml-auto text-xs text-stone-500">
                              {cited.length} cited of {sources.length} found
                            </span>
                          </>
                        ) : (
                          <span className="font-medium text-stone-700">
                            {live
                              ? `${sources.length} hadith found`
                              : `${sources.length} hadith searched, none cited`}
                          </span>
                        )}
                      </summary>
                      <div className="flex flex-col gap-6 px-4 pb-4 pt-1">
                        {groups.map((g) => (
                          <div key={g.title} className="flex flex-col gap-4">
                            <h3 className="text-xs font-semibold text-stone-500">{g.title}</h3>
                            {g.items.map((n) => {
                              const id = `t${ti}-s${n}`;
                              const h = sources[n - 1];
                              return (
                                <div
                                  key={id}
                                  id={id}
                                  tabIndex={-1}
                                  aria-label={sourceLabel(h)}
                                  className={cn(
                                    "-m-2 rounded-2xl p-2 outline-none transition-colors duration-700",
                                    highlighted === id && "bg-primary-light",
                                  )}
                                >
                                  {lastCited === id && (
                                    <button
                                      type="button"
                                      onClick={() => backToAnswer(ti)}
                                      className="mb-2 inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-primary hover:bg-primary-light/60"
                                    >
                                      <ArrowUp className="h-4 w-4" aria-hidden />
                                      Back to answer
                                    </button>
                                  )}
                                  {/* "% match" is a search ranking; on Ask it reads like an authenticity score. */}
                                  <HadithCard hadith={{ ...h, similarity: undefined }} />
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                  {t.sources && t.sources.length === 0 && (
                    <p className="text-sm text-stone-500">No hadith matched in the selected books.</p>
                  )}

                  <div
                    id={`t${ti}-answer`}
                    tabIndex={-1}
                    className="scroll-mt-20 rounded-xl border border-border bg-white p-6 shadow-sm outline-none"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3 text-sm text-stone-500">
                      <span role="status">
                        {live && !visibleAnswer ? honorifics(statusLine(t, elapsed)) : "Answer"}
                      </span>
                      <span className="flex shrink-0 items-center gap-1 tabular-nums text-stone-500">
                        <Timer className="h-4 w-4" aria-hidden />
                        {t.finishedAt === undefined
                          ? clock(elapsed)
                          : `${t.status === "done" ? "Answered in" : "Stopped after"} ${(elapsed / 1000).toFixed(1)}s`}
                      </span>
                    </div>
                    {/* aria-busy holds the live-region announcement until the answer finishes streaming. */}
                    <div aria-live="polite" aria-busy={live}>
                      {notCovered && t.status === "done" ? (
                        <NotCovered onRephrase={() => rephrase(t.question)} />
                      ) : (
                        visibleAnswer && (
                          <Answer
                            text={visibleAnswer}
                            sources={sources}
                            turn={ti}
                            expanded={openSources.has(ti)}
                            onCite={(n) => cite(ti, n)}
                          />
                        )
                      )}
                      {(t.status === "error" || t.status === "stopped") && (
                        <div className={cn("flex flex-wrap items-center gap-3", visibleAnswer && "mt-4")}>
                          <p className={cn("text-sm", t.status === "error" ? "text-danger" : "text-stone-500")}>
                            {t.status === "error" ? t.error : "You stopped this answer."}
                          </p>
                          {ti === turns.length - 1 && (
                            <Button type="button" variant="outline" size="sm" onClick={() => ask(t.question, true)}>
                              <RotateCcw className="h-4 w-4" aria-hidden />
                              {t.status === "error" ? "Try again" : "Ask again"}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="sticky bottom-4 mt-6 flex gap-3 rounded-lg border border-border bg-background/90 p-3 shadow-sm backdrop-blur-sm"
          >
            <Input
              ref={inputRef}
              name="question"
              aria-label="Your question"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={turns.length ? "Ask a follow-up…" : "Ask a question…"}
              maxLength={MAX_CHARS}
            />
            {streaming ? (
              <Button type="button" variant="outline" onClick={stop}>
                Stop
              </Button>
            ) : (
              <Button type="submit" disabled={!filter || !input.trim()}>
                Ask
              </Button>
            )}
          </form>
          <p className="mt-2 text-center text-xs text-stone-500">
            {filter
              ? "Conversations aren't saved. Refreshing the page clears them."
              : "Select at least one book to ask a question."}
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
