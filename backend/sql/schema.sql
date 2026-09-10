CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE collections (
    id VARCHAR(100) PRIMARY KEY,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    author_en VARCHAR(255),
    author_ar VARCHAR(255),
    type VARCHAR(50),
    scraped_at TIMESTAMPTZ
);

CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    collection_id VARCHAR(100) NOT NULL
        REFERENCES collections(id)
        ON DELETE CASCADE,

    book_number INTEGER NOT NULL,
    book_key VARCHAR(255),
    name_en TEXT,
    name_ar TEXT,

    UNIQUE(collection_id, book_number)
);

CREATE TABLE chapters (
    id SERIAL PRIMARY KEY,
    book_id INTEGER NOT NULL
        REFERENCES books(id)
        ON DELETE CASCADE,

    chapter_number INTEGER NOT NULL,
    name_en TEXT,
    name_ar TEXT,

    UNIQUE(book_id, chapter_number)
);

CREATE TABLE hadiths (
    id SERIAL PRIMARY KEY,

    collection_id VARCHAR(100) NOT NULL
        REFERENCES collections(id)
        ON DELETE CASCADE,

    book_id INTEGER
        REFERENCES books(id)
        ON DELETE SET NULL,

    chapter_id INTEGER
        REFERENCES chapters(id)
        ON DELETE SET NULL,

    hadith_number VARCHAR(50) NOT NULL,
    reference TEXT,
    in_book_reference TEXT,

    text_ar TEXT,
    text_en TEXT,

    isnad_ar TEXT,
    isnad_en TEXT,

    matn_ar TEXT,
    matn_en TEXT,

    closing_ar TEXT,
    narrator TEXT,

    has_variants BOOLEAN,

    source_reference TEXT,
    source_grade TEXT,

    grade_en TEXT,
    grade_ar TEXT,

    url_source TEXT,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(collection_id, hadith_number)
);

CREATE INDEX idx_books_collection
    ON books(collection_id);

CREATE INDEX idx_chapters_book
    ON chapters(book_id);

CREATE INDEX idx_hadiths_collection
    ON hadiths(collection_id);

CREATE INDEX idx_hadiths_book
    ON hadiths(book_id);

CREATE INDEX idx_hadiths_chapter
    ON hadiths(chapter_id);

CREATE INDEX idx_hadiths_reference
    ON hadiths(reference);

CREATE INDEX idx_hadiths_collection_book
    ON hadiths(collection_id, book_id);

CREATE INDEX idx_hadiths_fts_en
    ON hadiths USING GIN (
        to_tsvector('english', coalesce(matn_en, '') || ' ' || coalesce(text_en, ''))
    );
