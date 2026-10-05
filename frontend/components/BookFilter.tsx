"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react";
import { getBooks, getCollections } from "@/lib/api";
import type { BookInfo, BookSelection, CollectionInfo } from "@/lib/types";

// Per collection: "all" = whole collection, number[] = only these books.
// A collection missing from the map is excluded.
type Picked = Record<string, "all" | number[]>;

interface BookFilterProps {
  // null = nothing selected (callers should disable search).
  onChange: (selection: BookSelection | null) => void;
}

function toSelection(picked: Picked, collections: CollectionInfo[]): BookSelection | null {
  const entries = Object.entries(picked);
  if (entries.length === 0) return null;
  if (entries.length === collections.length && entries.every(([, v]) => v === "all")) {
    return { collection_ids: null, book_ids: null };
  }
  return {
    collection_ids: entries.filter(([, v]) => v === "all").map(([id]) => id),
    book_ids: entries.flatMap(([, v]) => (v === "all" ? [] : v)),
  };
}

export default function BookFilter({ onChange }: BookFilterProps) {
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [picked, setPicked] = useState<Picked>({});
  const [books, setBooks] = useState<Record<string, BookInfo[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getCollections()
      .then((data) => {
        setCollections(data.collections);
        setPicked(Object.fromEntries(data.collections.map((c) => [c.id, "all"])));
      })
      .catch(() => {}); // filter stays empty; search still works unfiltered
  }, []);

  const update = (next: Picked) => {
    setPicked(next);
    onChange(toSelection(next, collections));
  };

  const toggleCollection = (id: string) => {
    const next = { ...picked };
    if (next[id] === "all") delete next[id];
    else next[id] = "all";
    update(next);
  };

  const toggleBook = (collectionId: string, bookId: number) => {
    const all = books[collectionId].map((b) => b.id);
    const current = picked[collectionId];
    const ids = current === "all" ? all : (current ?? []);
    const nextIds = ids.includes(bookId) ? ids.filter((i) => i !== bookId) : [...ids, bookId];
    const next = { ...picked };
    if (nextIds.length === 0) delete next[collectionId];
    else next[collectionId] = nextIds.length === all.length ? "all" : nextIds;
    update(next);
  };

  const toggleExpanded = (id: string) => {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
    if (!books[id]) {
      getBooks(id)
        .then((data) => setBooks((b) => ({ ...b, [id]: data.books })))
        .catch(() => setExpanded((e) => ({ ...e, [id]: false })));
    }
  };

  const selection = toSelection(picked, collections);
  const summary =
    selection === null
      ? "No books selected"
      : selection.collection_ids === null
        ? "All six books"
        : `${Object.keys(picked).length} of ${collections.length} collections`;

  if (collections.length === 0) return null;

  return (
    <details className="group rounded-lg border border-border bg-white">
      <summary className="flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden gap-2 px-4 py-3 text-sm text-stone-600">
        <SlidersHorizontal className="h-4 w-4 text-primary" />
        <span className="font-medium">Filter books</span>
        <span className="text-stone-400">· {summary}</span>
        <ChevronDown className="ml-auto h-4 w-4 text-stone-400 transition-transform group-open:rotate-180" />
      </summary>

      <div className="border-t border-border px-4 py-3">
        <div className="mb-3 flex gap-3 text-xs">
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => update(Object.fromEntries(collections.map((c) => [c.id, "all"])))}
          >
            Select all
          </button>
          <button type="button" className="text-primary hover:underline" onClick={() => update({})}>
            Select none
          </button>
        </div>

        <ul className="flex flex-col gap-1">
          {collections.map((c) => {
            const state = picked[c.id];
            const isOpen = expanded[c.id];
            return (
              <li key={c.id}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(c.id)}
                    aria-expanded={!!isOpen}
                    aria-label={`Show books in ${c.name_en}`}
                    className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-primary"
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={state === "all"}
                      ref={(el) => {
                        if (el) el.indeterminate = Array.isArray(state);
                      }}
                      onChange={() => toggleCollection(c.id)}
                    />
                    {c.name_en}
                    <span className="text-xs text-stone-400">
                      {c.hadith_count.toLocaleString()}
                    </span>
                  </label>
                </div>

                {isOpen && (
                  <ul className="ml-9 mt-1 flex max-h-60 flex-col gap-1 overflow-y-auto border-l border-stone-100 pl-3">
                    {!books[c.id] ? (
                      <li className="text-xs text-stone-400">Loading…</li>
                    ) : (
                      books[c.id].map((b) => (
                        <li key={b.id}>
                          <label className="flex cursor-pointer items-center gap-2 text-xs text-stone-600">
                            <input
                              type="checkbox"
                              className="accent-primary"
                              checked={state === "all" || (Array.isArray(state) && state.includes(b.id))}
                              onChange={() => toggleBook(c.id, b.id)}
                            />
                            {b.book_number}. {b.name_en}
                          </label>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}
