import os
import sys
import time
from datetime import datetime, timezone

import psycopg2
from dotenv import load_dotenv
from google import genai
from google.genai import types


# ============================================================
# Configuration
# ============================================================

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set.")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set.")


# Gemini embedding model
MODEL = "gemini-embedding-001"

# IMPORTANT:
# This must match your PostgreSQL vector dimension.
#
# Your database currently uses:
#
#     vector(1536)
#
# Gemini supports reduced output dimensionality.
OUTPUT_DIMENSIONALITY = 1536


# ------------------------------------------------------------
# Rate limiting
# ------------------------------------------------------------
#
# This is YOUR local safety limit.
#
# It does not guarantee that Gemini will accept the requests.
# Google's actual limits depend on your project/model/tier.
#
# Example:
#
# 10 requests/minute means one request every 6 seconds.
#
# We use 10 seconds between requests by default.
#
# Since each API request can contain multiple Hadiths,
# this is considerably more conservative than sending one
# request per Hadith.
# ------------------------------------------------------------

SECONDS_BETWEEN_REQUESTS = 60.0


# Number of Hadiths sent in one embedding request.
#
# Start conservatively.
#
# You can increase this later if your requests comfortably
# stay under your project's token limits.
BATCH_SIZE = 100


# ============================================================
# Gemini client
# ============================================================

client = genai.Client(
    api_key=GEMINI_API_KEY
)


# ============================================================
# Database
# ============================================================

def get_connection():
    return psycopg2.connect(DATABASE_URL)


# ============================================================
# Build text for embedding
# ============================================================

def build_embedding_text(row):
    """
    Build the document that will be embedded.

    We prefer matn_en because it contains the actual content
    of the Hadith rather than the full isnad.

    Falls back to text_en if matn_en is unavailable.

    row:
        id
        reference
        text_en
        matn_en
    """

    hadith_id, reference, text_en, matn_en = row

    text = matn_en or text_en

    if not text:
        return None

    return text.strip()


# ============================================================
# Detect rate limiting
# ============================================================

def is_rate_limit_error(error):
    """
    Gemini can return a 429 RESOURCE_EXHAUSTED error when
    a rate limit/quota is exceeded.

    We intentionally do NOT retry it.
    """

    error_text = str(error).lower()

    rate_limit_indicators = [
        "429",
        "resource_exhausted",
        "resource exhausted",
        "rate limit",
        "quota exceeded",
        "too many requests",
    ]

    return any(
        indicator in error_text
        for indicator in rate_limit_indicators
    )


# ============================================================
# Get retry information if available
# ============================================================

def extract_retry_delay(error):
    """
    Try to extract a retry delay from Gemini's error.

    Gemini errors do not always expose this in a consistent
    way through the Python SDK, so this is best-effort.

    Returns:
        float | None
    """

    error_text = str(error)

    # Example error text can contain something like:
    #
    # retryDelay': '34s'
    #
    # We don't depend on this being present.

    import re

    matches = re.findall(
        r"retryDelay['\"]?\s*[:=]\s*['\"]?(\d+(?:\.\d+)?)s",
        error_text,
        flags=re.IGNORECASE,
    )

    if matches:
        return float(matches[0])

    return None


# ============================================================
# Embed one batch
# ============================================================

def embed_batch(texts):
    """
    Send one batch to Gemini.

    Uses RETRIEVAL_DOCUMENT because these texts are documents
    that will later be retrieved by semantic search.
    """

    response = client.models.embed_content(
        model=MODEL,
        contents=texts,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=OUTPUT_DIMENSIONALITY,
        ),
    )

    if not response.embeddings:
        raise RuntimeError(
            "Gemini returned no embeddings."
        )

    if len(response.embeddings) != len(texts):
        raise RuntimeError(
            f"Expected {len(texts)} embeddings, "
            f"but Gemini returned "
            f"{len(response.embeddings)}."
        )

    return [
        embedding.values
        for embedding in response.embeddings
    ]


# ============================================================
# Main
# ============================================================

def main():

    print("=" * 60)
    print("Hadith Gemini Embedding Importer")
    print("=" * 60)

    print(f"Model: {MODEL}")
    print(f"Vector dimensions: {OUTPUT_DIMENSIONALITY}")
    print(f"Batch size: {BATCH_SIZE}")
    print(
        f"Seconds between requests: "
        f"{SECONDS_BETWEEN_REQUESTS}"
    )
    print()

    connection = get_connection()

    total_processed = 0
    last_processed_id = None

    try:

        while True:

            # ------------------------------------------------
            # Get the next batch that has NOT been embedded
            # WITH THIS MODEL.
            #
            # A missing hadith_embeddings row is the status, so
            # re-pointing MODEL at a new model backfills the whole
            # corpus for it without touching the existing rows.
            #
            # Rows with no English text are filtered out in SQL --
            # they can never be embedded, and leaving them in the
            # result would wedge the run permanently once a whole
            # page of them reached the top of the ordering.
            # ------------------------------------------------

            with connection.cursor() as cursor:

                cursor.execute(
                    """
                    SELECT
                        h.id,
                        h.reference,
                        h.text_en,
                        h.matn_en
                    FROM hadiths h
                    LEFT JOIN hadith_embeddings e
                           ON e.hadith_id = h.id
                          AND e.model = %s
                    WHERE e.hadith_id IS NULL
                      AND coalesce(
                              nullif(trim(h.matn_en), ''),
                              nullif(trim(h.text_en), '')
                          ) IS NOT NULL
                    ORDER BY h.id
                    LIMIT %s
                    """,
                    (MODEL, BATCH_SIZE),
                )

                rows = cursor.fetchall()

            # ------------------------------------------------
            # Nothing left to process
            # ------------------------------------------------

            if not rows:

                print()
                print("=" * 60)
                print("DONE")
                print("=" * 60)
                print(
                    f"Hadiths embedded this run: "
                    f"{total_processed}"
                )

                if last_processed_id is not None:
                    print(
                        f"Last processed ID: "
                        f"{last_processed_id}"
                    )

                print("No Hadiths remain with NULL embeddings.")

                break

            # ------------------------------------------------
            # Build embedding texts
            # ------------------------------------------------

            valid_rows = []
            texts = []

            for row in rows:

                embedding_text = build_embedding_text(row)

                if not embedding_text:
                    print(
                        f"WARNING: Hadith ID {row[0]} "
                        f"has no English text. Skipping."
                    )
                    continue

                valid_rows.append(row)
                texts.append(embedding_text)

            # ------------------------------------------------
            # If all rows were missing text, mark nothing.
            #
            # This means the script could repeatedly encounter
            # them.
            #
            # For now, stop rather than silently modifying data.
            # ------------------------------------------------

            if not valid_rows:

                print()
                print(
                    "No embeddable Hadiths found in the "
                    "current batch."
                )
                print(
                    "Nothing was modified."
                )

                break

            first_id = valid_rows[0][0]
            last_id = valid_rows[-1][0]

            print(
                f"Processing IDs "
                f"{first_id} -> {last_id} "
                f"({len(valid_rows)} Hadiths)"
            )

            # ------------------------------------------------
            # Rate limiter
            # ------------------------------------------------

            if total_processed > 0:

                print(
                    f"Waiting "
                    f"{SECONDS_BETWEEN_REQUESTS:.1f}s "
                    f"before next API request..."
                )

                time.sleep(
                    SECONDS_BETWEEN_REQUESTS
                )

            # ------------------------------------------------
            # Call Gemini
            # ------------------------------------------------

            try:

                embeddings = embed_batch(texts)

            except Exception as error:

                print()
                print("=" * 60)

                if is_rate_limit_error(error):

                    print("RATE LIMIT / QUOTA HIT")
                    print("=" * 60)

                    print()
                    print(
                        "The script is stopping immediately."
                    )

                    print(
                        "No retry will be attempted."
                    )

                    print()

                    if last_processed_id is not None:
                        print(
                            f"Last successfully processed ID: "
                            f"{last_processed_id}"
                        )

                    print(
                        f"Next unprocessed ID should be: "
                        f"{first_id}"
                    )

                    retry_delay = extract_retry_delay(error)

                    if retry_delay is not None:

                        resume_time = (
                            time.time() + retry_delay
                        )

                        resume_datetime = datetime.fromtimestamp(
                            resume_time,
                            tz=timezone.utc
                        )

                        print(
                            f"Gemini suggested waiting "
                            f"{retry_delay:.0f} seconds."
                        )

                        print(
                            f"Suggested resume time: "
                            f"{resume_datetime.isoformat()}"
                        )

                    else:

                        print(
                            "Gemini did not provide a "
                            "retry delay in the error."
                        )

                        print(
                            "Check your Gemini API quota "
                            "before running again."
                        )

                    print()

                    return

                # ------------------------------------------------
                # Non-rate-limit error
                # ------------------------------------------------

                print("GEMINI API ERROR")
                print("=" * 60)
                print(error)

                print()
                print(
                    "Stopping without modifying this batch."
                )

                return

            # ------------------------------------------------
            # Save embeddings
            #
            # IMPORTANT:
            # We only update the database AFTER Gemini
            # successfully returns the entire batch.
            # ------------------------------------------------

            with connection.cursor() as cursor:

                for row, embedding in zip(
                    valid_rows,
                    embeddings
                ):

                    hadith_id = row[0]

                    cursor.execute(
                        """
                        INSERT INTO hadith_embeddings
                            (hadith_id, model, embedding)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (hadith_id, model) DO NOTHING
                        """,
                        (
                            hadith_id,
                            MODEL,
                            embedding,
                        ),
                    )

            # ------------------------------------------------
            # Commit immediately.
            #
            # If the program crashes after this point,
            # these Hadiths remain completed.
            # ------------------------------------------------

            connection.commit()

            total_processed += len(valid_rows)
            last_processed_id = last_id

            print(
                f"Saved {len(valid_rows)} embeddings."
            )

            print(
                f"Total processed this run: "
                f"{total_processed}"
            )

            print(
                f"Last processed ID: "
                f"{last_processed_id}"
            )

            print()

    except KeyboardInterrupt:

        print()
        print("=" * 60)
        print("STOPPED BY USER")
        print("=" * 60)

        print(
            f"Hadiths successfully committed this run: "
            f"{total_processed}"
        )

        if last_processed_id is not None:
            print(
                f"Last processed ID: "
                f"{last_processed_id}"
            )

        print(
            "Run the script again to continue."
        )

    except Exception as error:

        connection.rollback()

        print()
        print("=" * 60)
        print("UNEXPECTED ERROR")
        print("=" * 60)
        print(error)

        print()
        print(
            "The current uncommitted batch was rolled back."
        )

        if last_processed_id is not None:
            print(
                f"Last successfully committed ID: "
                f"{last_processed_id}"
            )

        print(
            "Run the script again to continue."
        )

        raise

    finally:

        connection.close()


if __name__ == "__main__":
    main()
