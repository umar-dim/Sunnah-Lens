import json
import os
import sys

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv


# --------------------------------------------------
# Configuration
# --------------------------------------------------

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. "
        "Create a .env file with your PostgreSQL connection string."
    )


# --------------------------------------------------
# Helpers
# --------------------------------------------------

def clean(value):
    """
    Convert empty strings to None.
    Keep valid values unchanged.
    """
    if value is None:
        return None

    if isinstance(value, str) and not value.strip():
        return None

    return value


def get_chapter_map(book):
    """
    Creates:

        chapter_number -> chapter data

    for quick lookup.
    """

    chapter_map = {}

    for chapter in book.get("chapters", []):
        chapter_number = chapter.get("chapter_number")

        if chapter_number is not None:
            chapter_map[chapter_number] = chapter

    return chapter_map


# --------------------------------------------------
# Import
# --------------------------------------------------

def import_hadith(json_file):
    print(f"Loading: {json_file}")

    with open(json_file, "r", encoding="utf-8") as file:
        data = json.load(file)

    collection = data["collection"]
    books = data.get("books", [])

    collection_id = collection["id"]

    print(f"Collection: {collection['name_en']}")
    print(f"Books found: {len(books)}")

    connection = psycopg2.connect(DATABASE_URL)

    try:
        with connection.cursor() as cursor:

            # ------------------------------------------
            # Collection
            # ------------------------------------------

            cursor.execute(
                """
                INSERT INTO collections (
                    id,
                    name_en,
                    name_ar,
                    author_en,
                    author_ar,
                    type,
                    scraped_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id)
                DO UPDATE SET
                    name_en = EXCLUDED.name_en,
                    name_ar = EXCLUDED.name_ar,
                    author_en = EXCLUDED.author_en,
                    author_ar = EXCLUDED.author_ar,
                    type = EXCLUDED.type,
                    scraped_at = EXCLUDED.scraped_at
                """,
                (
                    collection["id"],
                    collection.get("name_en"),
                    collection.get("name_ar"),
                    collection.get("author_en"),
                    collection.get("author_ar"),
                    collection.get("type"),
                    collection.get("scraped_at"),
                ),
            )

            total_hadiths = 0

            # ------------------------------------------
            # Books
            # ------------------------------------------

            for book in books:

                book_number = book["book_number"]

                print(
                    f"Importing Book {book_number}: "
                    f"{book.get('name_en')}"
                )

                cursor.execute(
                    """
                    INSERT INTO books (
                        collection_id,
                        book_number,
                        book_key,
                        name_en,
                        name_ar
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (collection_id, book_number)
                    DO UPDATE SET
                        book_key = EXCLUDED.book_key,
                        name_en = EXCLUDED.name_en,
                        name_ar = EXCLUDED.name_ar
                    RETURNING id
                    """,
                    (
                        collection_id,
                        book_number,
                        clean(book.get("book_key")),
                        clean(book.get("name_en")),
                        clean(book.get("name_ar")),
                    ),
                )

                book_id = cursor.fetchone()[0]

                # --------------------------------------
                # Chapters
                # --------------------------------------

                chapter_map = get_chapter_map(book)

                chapter_ids = {}

                for chapter_number, chapter in chapter_map.items():

                    cursor.execute(
                        """
                        INSERT INTO chapters (
                            book_id,
                            chapter_number,
                            name_en,
                            name_ar
                        )
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (book_id, chapter_number)
                        DO UPDATE SET
                            name_en = EXCLUDED.name_en,
                            name_ar = EXCLUDED.name_ar
                        RETURNING id
                        """,
                        (
                            book_id,
                            chapter_number,
                            clean(chapter.get("name_en")),
                            clean(chapter.get("name_ar")),
                        ),
                    )

                    chapter_id = cursor.fetchone()[0]

                    chapter_ids[chapter_number] = chapter_id

                # --------------------------------------
                # Hadiths
                # --------------------------------------

                for hadith in book.get("hadiths", []):

                    hadith_number = str(
                        hadith["hadith_number"]
                    )

                    chapter_number = hadith.get(
                        "chapter_number"
                    )

                    chapter_id = None

                    if chapter_number is not None:
                        chapter_id = chapter_ids.get(
                            chapter_number
                        )

                    cursor.execute(
                        """
                        INSERT INTO hadiths (
                            collection_id,
                            book_id,
                            chapter_id,
                            hadith_number,
                            reference,
                            in_book_reference,
                            text_ar,
                            text_en,
                            isnad_ar,
                            isnad_en,
                            matn_ar,
                            matn_en,
                            closing_ar,
                            narrator,
                            has_variants,
                            source_reference,
                            source_grade,
                            grade_en,
                            grade_ar,
                            url_source
                        )
                        VALUES (
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s
                        )
                        ON CONFLICT (
                            collection_id,
                            hadith_number
                        )
                        DO UPDATE SET
                            book_id = EXCLUDED.book_id,
                            chapter_id = EXCLUDED.chapter_id,
                            reference = EXCLUDED.reference,
                            in_book_reference = EXCLUDED.in_book_reference,
                            text_ar = EXCLUDED.text_ar,
                            text_en = EXCLUDED.text_en,
                            isnad_ar = EXCLUDED.isnad_ar,
                            isnad_en = EXCLUDED.isnad_en,
                            matn_ar = EXCLUDED.matn_ar,
                            matn_en = EXCLUDED.matn_en,
                            closing_ar = EXCLUDED.closing_ar,
                            narrator = EXCLUDED.narrator,
                            has_variants = EXCLUDED.has_variants,
                            source_reference = EXCLUDED.source_reference,
                            source_grade = EXCLUDED.source_grade,
                            grade_en = EXCLUDED.grade_en,
                            grade_ar = EXCLUDED.grade_ar,
                            url_source = EXCLUDED.url_source
                        """,
                        (
                            collection_id,
                            book_id,
                            chapter_id,

                            hadith_number,
                            clean(hadith.get("reference")),
                            clean(hadith.get("in_book_reference")),

                            clean(hadith.get("text_ar")),
                            clean(hadith.get("text_en")),

                            clean(hadith.get("isnad_ar")),
                            clean(hadith.get("isnad_en")),

                            clean(hadith.get("matn_ar")),
                            clean(hadith.get("matn_en")),

                            clean(hadith.get("closing_ar")),
                            clean(hadith.get("narrator")),

                            hadith.get("has_variants"),

                            clean(hadith.get("source_reference")),
                            clean(hadith.get("source_grade")),

                            clean(hadith.get("grade_en")),
                            clean(hadith.get("grade_ar")),

                            clean(hadith.get("url_source")),
                        ),
                    )

                    total_hadiths += 1

            connection.commit()

            print()
            print("Import completed successfully.")
            print(f"Books: {len(books)}")
            print(f"Hadiths: {total_hadiths}")

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# --------------------------------------------------
# CLI
# --------------------------------------------------

if __name__ == "__main__":

    if len(sys.argv) != 2:
        print(
            "Usage:\n"
            "  python scripts/import_hadith.py "
            "data/bukhari.json"
        )
        sys.exit(1)

    import_hadith(sys.argv[1])
