
"""
RAG pipeline: FAISS + sentence-transformers + Groq LLM for medical Q&A.
When medicine names are detected in a question, verified data from medicines.csv
is injected into the context so the AI uses accurate, database-sourced information.
"""
import os
import json
import asyncio
import numpy as np

VECTOR_STORE_DIR = os.getenv("VECTOR_STORE_DIR", "./vector_store")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are MediZen, an AI health information assistant.
You answer health and medical questions using the provided context.

Rules:
- When VERIFIED MEDICINE DATA from our medicines.csv database is provided in the context,
  you MUST use that data as the primary source of truth for medicine name, strength,
  purpose, and conditions treated. Do NOT contradict or ignore verified medicine data.
- Base answers on the provided context. If context is insufficient, say so clearly.
- End every answer with a one-sentence disclaimer that this is informational only and
  not a replacement for a licensed doctor or pharmacist.
- Be clear, concise, and use plain language accessible to non-medical users.
- Never suggest specific prescription dosages or replace professional diagnosis.
- ALWAYS respond in plain conversational text and markdown (headings, bullet points, bold).
- NEVER return JSON, code blocks, or structured data objects — only human-readable prose.
- NEVER include a confidence level, confidence score, or any label like "Confidence:" in your answer.
- When you present medicine information sourced from our database, note it as verified.
"""


class RAGService:
    def __init__(self):
        self.index = None
        self.chunks = []
        self.embedder = None
        self.ready = False

    async def initialize(self):
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._load_sync)

    def _load_sync(self):
        try:
            import faiss
            from sentence_transformers import SentenceTransformer

            index_path = os.path.join(VECTOR_STORE_DIR, "medical.index")
            chunks_path = os.path.join(VECTOR_STORE_DIR, "chunks.json")

            if not os.path.exists(index_path) or not os.path.exists(chunks_path):
                print("[RAG] Vector store not found — run ingest.py first. Using fallback mode.")
                self.ready = False
                return

            self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
            self.index = faiss.read_index(index_path)
            with open(chunks_path, "r", encoding="utf-8") as f:
                self.chunks = json.load(f)
            self.ready = True
            print(f"[RAG] Loaded {len(self.chunks)} chunks from vector store.")
        except Exception as e:
            print(f"[RAG] Failed to load vector store: {e}")
            self.ready = False

    def retrieve(self, query: str, k: int = 5) -> list[str]:
        if not self.ready or self.embedder is None:
            return []
        embedding = self.embedder.encode([query], normalize_embeddings=True).astype("float32")
        _, indices = self.index.search(embedding, k)
        return [self.chunks[i] for i in indices[0] if 0 <= i < len(self.chunks)]

    def _build_medicine_context(self, question: str) -> tuple[str, list[dict]]:
        """
        Detect medicine mentions in question and return verified data from medicines.csv.
        Returns (medicine_context_block, list_of_matched_medicines).
        """
        try:
            from services import medicine_service
            matched = medicine_service.detect_medicines_in_text(question, max_results=3)
            if not matched:
                return "", []
            cards = [medicine_service.format_medicine_card(m) for m in matched]
            block = (
                "=== VERIFIED MEDICINE DATA (Source: medicines.csv database) ===\n"
                "The following medicine information is verified and must be used as the primary source of truth:\n\n"
                + "\n\n".join(cards)
                + "\n=== END VERIFIED MEDICINE DATA ==="
            )
            return block, matched
        except Exception as e:
            print(f"[RAG] Medicine context error: {e}")
            return "", []

    async def answer(self, question: str, history: list[dict] | None = None) -> dict:
        context_chunks = self.retrieve(question)
        context = "\n\n---\n\n".join(context_chunks) if context_chunks else ""

        # Inject verified medicine data from medicines.csv when relevant
        medicine_context, matched_medicines = self._build_medicine_context(question)

        if not GROQ_API_KEY:
            return self._fallback_response(question, context_chunks, matched_medicines)

        try:
            from groq import Groq
            client = Groq(api_key=GROQ_API_KEY)

            messages = [{"role": "system", "content": SYSTEM_PROMPT}]

            if history:
                for msg in history[-6:]:
                    messages.append({"role": msg["role"], "content": msg["content"]})

            # Build user content: verified medicine data first, then encyclopedia context
            user_content = question
            context_parts = []
            if medicine_context:
                context_parts.append(medicine_context)
            if context:
                context_parts.append(f"Context from medical encyclopedia:\n{context}")

            if context_parts:
                user_content = "\n\n".join(context_parts) + f"\n\nUser question: {question}"

            messages.append({"role": "user", "content": user_content})

            response = client.chat.completions.create(
                model=GROQ_MODEL,
                max_tokens=1024,
                messages=messages,
            )
            answer_text = response.choices[0].message.content
            confidence = self._estimate_confidence(context_chunks)
            result = {
                "answer": answer_text,
                "confidence": confidence,
                "sources_found": len(context_chunks),
                "disclaimer": "This is AI-generated health information for educational purposes only. Always consult a licensed healthcare professional.",
            }
            if matched_medicines:
                result["verified_medicines"] = [
                    {
                        "brand_name": m.get("brand_name"),
                        "generic_name": m.get("generic_name"),
                        "strength": m.get("strength"),
                        "dosage_form": m.get("dosage_form"),
                        "purpose": m.get("purpose"),
                        "diseases": m.get("diseases", []),
                        "source": "medicines.csv",
                    }
                    for m in matched_medicines
                ]
            return result
        except Exception as e:
            print(f"[RAG] Groq API error: {e}")
            return self._fallback_response(question, context_chunks, matched_medicines)

    def _estimate_confidence(self, chunks: list) -> str:
        if len(chunks) >= 4:
            return "High"
        if len(chunks) >= 2:
            return "Medium"
        return "Low"

    def _fallback_response(self, question: str, chunks: list, matched_medicines: list | None = None) -> dict:
        parts = []
        if matched_medicines:
            try:
                from services import medicine_service
                cards = [medicine_service.format_medicine_card(m) for m in matched_medicines]
                parts.append(
                    "**Verified medicine information from our database:**\n\n"
                    + "\n\n".join(cards)
                )
            except Exception:
                pass
        if chunks:
            preview = chunks[0][:400]
            parts.append(
                f"Based on the medical encyclopedia:\n\n{preview}...\n\n"
                "For a complete and accurate answer, please consult a qualified healthcare professional."
            )
        else:
            parts.append(
                "I couldn't find specific information about this in the medical knowledge base. "
                "Please consult a healthcare professional for accurate medical advice."
            )
        answer = "\n\n".join(parts)
        result = {
            "answer": answer,
            "confidence": "Low" if not chunks else "Medium",
            "sources_found": len(chunks),
            "disclaimer": "This is AI-generated health information for educational purposes only. Always consult a licensed healthcare professional.",
        }
        if matched_medicines:
            result["verified_medicines"] = [
                {
                    "brand_name": m.get("brand_name"),
                    "generic_name": m.get("generic_name"),
                    "strength": m.get("strength"),
                    "dosage_form": m.get("dosage_form"),
                    "purpose": m.get("purpose"),
                    "diseases": m.get("diseases", []),
                    "source": "medicines.csv",
                }
                for m in matched_medicines
            ]
        return result


rag_service = RAGService()
