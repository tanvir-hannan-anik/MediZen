"""
PDF ingestion script — run once before starting the server.
Usage: python ingest.py

Splits the medical PDF into chunks, generates embeddings,
and saves a FAISS index to VECTOR_STORE_DIR.
"""
import os
import json
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

PDF_PATH = os.getenv(
    "PDF_PATH",
    str(Path(__file__).parent.parent / "gale-encyclopedia-of-medicine.-vol.-1.-2nd-ed.pdf"),
)
VECTOR_STORE_DIR = os.getenv("VECTOR_STORE_DIR", "./vector_store")
CHUNK_SIZE = 800
CHUNK_OVERLAP = 100
BATCH_SIZE = 64


def main():
    print(f"[Ingest] Loading PDF: {PDF_PATH}")
    if not os.path.exists(PDF_PATH):
        print(f"[Ingest] ERROR: PDF not found at {PDF_PATH}")
        sys.exit(1)

    # Extract text from PDF
    from pypdf import PdfReader
    reader = PdfReader(PDF_PATH)
    total_pages = len(reader.pages)
    print(f"[Ingest] {total_pages} pages found. Extracting text...")

    full_text = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            full_text.append(text)
        if (i + 1) % 100 == 0:
            print(f"[Ingest] Processed {i + 1}/{total_pages} pages")

    combined = "\n\n".join(full_text)
    print(f"[Ingest] Total characters extracted: {len(combined):,}")

    # Split into chunks
    chunks = []
    start = 0
    while start < len(combined):
        end = start + CHUNK_SIZE
        chunk = combined[start:end]
        if len(chunk.strip()) > 50:
            chunks.append(chunk.strip())
        start += CHUNK_SIZE - CHUNK_OVERLAP

    print(f"[Ingest] Created {len(chunks):,} chunks")

    # Generate embeddings
    from sentence_transformers import SentenceTransformer
    import faiss
    import numpy as np

    print("[Ingest] Loading embedding model (all-MiniLM-L6-v2)...")
    embedder = SentenceTransformer("all-MiniLM-L6-v2")

    print("[Ingest] Generating embeddings in batches...")
    all_embeddings = []
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        embs = embedder.encode(batch, normalize_embeddings=True, show_progress_bar=False)
        all_embeddings.append(embs)
        if (i // BATCH_SIZE + 1) % 10 == 0:
            done = min(i + BATCH_SIZE, len(chunks))
            print(f"[Ingest] Embedded {done}/{len(chunks)} chunks")

    embeddings = np.vstack(all_embeddings).astype("float32")
    print(f"[Ingest] Embedding shape: {embeddings.shape}")

    # Build FAISS index
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)  # Inner product (cosine similarity with normalized vectors)
    index.add(embeddings)
    print(f"[Ingest] FAISS index built with {index.ntotal} vectors")

    # Save
    os.makedirs(VECTOR_STORE_DIR, exist_ok=True)
    faiss.write_index(index, os.path.join(VECTOR_STORE_DIR, "medical.index"))
    with open(os.path.join(VECTOR_STORE_DIR, "chunks.json"), "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False)

    print(f"[Ingest] Saved to {VECTOR_STORE_DIR}/")
    print("[Ingest] Done! You can now start the server.")


if __name__ == "__main__":
    main()
