# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Everyday English-speaking Muslims who want to know what the Prophet ﷺ said about something in their daily life: prayer, family, manners, worship, character. They usually don't know book names, chapter titles, or hadith numbers, and come with a question or topic in plain words rather than a reference to look up.

## Product Purpose

SUNNAH LENS lets someone describe what they're looking for in their own words and find the relevant hadith. It exists to make the Sunnah approachable without needing to memorize references or know Arabic search terms. Success means a user leaves with authentic, properly attributed narrations that actually answer what they asked.

## Positioning

Meaning-based search, deliberately scoped to the six canonical collections (Kutub al-Sittah). Results come from embeddings over the hadith text, not keyword matching alone, and they never leave the canonical core, so a seeker isn't handed narrations from obscure or weaker sources.

## Operating Context

- **Free search (`/search`):** semantic search. The user types a natural-language description and gets the closest-matching hadith, ranked by similarity.
- **Directory (`/directory`):** browse collection → book → hadith, plus English keyword search (stemmed; all words must appear; ranked by relevance) with pagination.
- **Both searches** can be narrowed with a book filter: any of the six collections, or individual sub-books within them. The default is everything.

## Capabilities and Constraints

- **Corpus:** Sahih al-Bukhari 7,252 · Sahih Muslim 3,087 (primary narrations only) · Sunan Abi Dawud 5,274 · Jami' at-Tirmidhi 3,951 · Sunan an-Nasa'i 5,754 · Sunan Ibn Majah 4,335. That is 29,653 hadith in total. Copy must name the six books and never claim more or fewer.
- **Hadith fields available:** Arabic and English full text and matn, narrator, grade (English/Arabic), collection, book, chapter, reference, and in-book reference.
- **Stack (existing):** Next.js 16 + React 19 + Tailwind 4 frontend; FastAPI + Postgres 17/pgvector backend; Gemini `gemini-embedding-001` for query embeddings.
- **Always show source references.** Every hadith displayed carries its collection, book, and number/reference. Nothing appears unattributed.
- **No religious rulings.** The app finds and displays text. It never presents itself as issuing fatwas or making its own judgement on authenticity. Grades are shown as recorded in the source data.
- **Arabic text is first-class.** Arabic narration text must render correctly: RTL, proper Arabic typography, and legibility equal to the English.

## Brand Commitments

- **Name:** SUNNAH LENS, written in caps in the existing UI.
- **Honorifics are preserved:** ﷺ after the Prophet's name and ﷻ after Allah's, with respectful phrasing throughout all copy.
- **Public repository:** https://github.com/umar-dim/Sunnah-Lens, linked from the footer.

## Evidence on Hand

- The hadith corpus itself (Postgres; local dump `hadith_ai.dump`).
- Existing copy in `frontend/components/Hero.tsx` and `ImportanceSection.tsx`, including the hadith "I have left among you two things…".
- No testimonials, usage numbers, scholarly endorsements, or press exist. Future work must not fabricate any.

## Product Principles

1. **Attribution over everything.** A hadith without its source is worse than no result.
2. **Find, don't rule.** Surface the text faithfully and leave interpretation to the reader and scholars.
3. **Ask like a person.** Users shouldn't need references, Arabic terms, or exact wording to find what they mean.
4. **Stay in the canon.** The six-book scope is a feature. Be explicit about what is and isn't covered.
5. **Both languages matter.** Arabic gets the same care as English.

## Accessibility & Inclusion

- Bilingual reading: correct `dir="rtl"` and `lang` on Arabic text, and an Arabic typeface that remains legible at reading sizes.
- No specific WCAG level has been set yet (open decision).
