"""
Ingest FAQ.md into a local ChromaDB persistent collection.

Each `### Question` heading + its following body becomes one document.
The enclosing `## Section` heading is stored as metadata.

Run:
    pip install -r requirements.txt
    python ingest_faq.py

Outputs a persistent Chroma store at ./chroma_store/ and a collection
named `dragon_gate_faq`. Re-running drops and recreates the collection
so the store always reflects the current FAQ.md.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

import chromadb
from chromadb.utils import embedding_functions
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
FAQ_PATH = ROOT.parent / "FAQ.md"
STORE_PATH = ROOT / "chroma_store"
COLLECTION_NAME = "dragon_gate_faq"

# Load .env from project root (preferred) or backend/ as fallback.
load_dotenv(ROOT.parent / ".env")
load_dotenv(ROOT / ".env")

# HuggingFace Inference API — sentence-transformers model.
HF_API_KEY = os.environ.get("HF_API_KEY", "").strip()
HF_MODEL = os.environ.get(
    "HF_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
)

# Force UTF-8 stdout so the smoke-test arrow prints on Windows cp1252 shells.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


from chromadb.api.types import EmbeddingFunction


class HFInferenceRouterEmbedding(EmbeddingFunction):
    """
    Custom embedding function that calls HuggingFace's current Inference
    Providers endpoint (router.huggingface.co/hf-inference). Chroma's bundled
    HuggingFaceEmbeddingFunction still targets the deprecated
    `api-inference.huggingface.co` host which now fails DNS in many regions.
    """

    def __init__(self, api_key: str, model_name: str):
        import httpx
        self.model_name = model_name
        self._url = (
            f"https://router.huggingface.co/hf-inference/models/"
            f"{model_name}/pipeline/feature-extraction"
        )
        self._client = httpx.Client(
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=60.0,
        )

    def __call__(self, input):
        import numpy as np
        r = self._client.post(
            self._url,
            json={"inputs": input, "options": {"wait_for_model": True}},
        )
        r.raise_for_status()
        data = r.json()
        return [np.array(e, dtype=np.float32) for e in data]

    # Chroma 0.5+ splits add vs query paths; both delegate to __call__.
    def embed_documents(self, input): return self.__call__(input)
    def embed_query(self, input):
        out = self.__call__([input] if isinstance(input, str) else input)
        return out[0] if isinstance(input, str) else out

    # Chroma calls these when persisting the collection
    def name(self): return "hf_router"
    def default_space(self): return "cosine"
    def get_config(self): return {"model_name": self.model_name}


def build_embedding_fn():
    """Use HuggingFace Inference Router if HF_API_KEY is set; else local default."""
    if HF_API_KEY:
        print(f"Embedding model: {HF_MODEL} (HuggingFace Inference Router)")
        return HFInferenceRouterEmbedding(api_key=HF_API_KEY, model_name=HF_MODEL)
    print("Embedding model: all-MiniLM-L6-v2 (local ONNX, no HF key set)")
    return embedding_functions.DefaultEmbeddingFunction()


def parse_faq(md: str) -> list[dict]:
    """Split FAQ.md into one chunk per `###` question."""
    chunks: list[dict] = []
    section = "General"
    current: dict | None = None

    for raw in md.splitlines():
        line = raw.rstrip()

        h2 = re.match(r"^##\s+(.+?)\s*$", line)
        h3 = re.match(r"^###\s+(.+?)\s*$", line)

        if h2:
            section = re.sub(r"^[^A-Za-z0-9]+", "", h2.group(1)).strip()
            continue

        if h3:
            if current:
                chunks.append(current)
            current = {
                "section": section,
                "question": h3.group(1).strip(),
                "answer_lines": [],
            }
            continue

        if current is not None:
            if re.match(r"^---\s*$", line):
                chunks.append(current)
                current = None
            else:
                current["answer_lines"].append(line)

    if current:
        chunks.append(current)

    out: list[dict] = []
    for c in chunks:
        answer = "\n".join(c["answer_lines"]).strip()
        if not answer:
            continue
        out.append(
            {
                "section": c["section"],
                "question": c["question"],
                "answer": answer,
                # Document text combines question + answer so the embedding
                # captures both the intent and the content.
                "document": f"Q: {c['question']}\nA: {answer}",
            }
        )
    return out


def main() -> None:
    if not FAQ_PATH.exists():
        raise SystemExit(f"FAQ.md not found at {FAQ_PATH}")

    md = FAQ_PATH.read_text(encoding="utf-8")
    chunks = parse_faq(md)
    print(f"Parsed {len(chunks)} Q/A chunks from {FAQ_PATH.name}")

    STORE_PATH.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(STORE_PATH))

    embed_fn = build_embedding_fn()

    # Recreate fresh so re-runs reflect the current FAQ.md.
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass

    collection = client.create_collection(
        name=COLLECTION_NAME,
        embedding_function=embed_fn,
        metadata={"source": "FAQ.md", "hnsw:space": "cosine"},
    )

    collection.add(
        ids=[f"faq-{i:03d}" for i in range(len(chunks))],
        documents=[c["document"] for c in chunks],
        metadatas=[
            {"section": c["section"], "question": c["question"], "answer": c["answer"]}
            for c in chunks
        ],
    )

    print(f"Uploaded {collection.count()} documents to '{COLLECTION_NAME}'")
    print(f"Persistent store: {STORE_PATH}")

    # Smoke test
    sample_query = "Where are you located?"
    res = collection.query(query_texts=[sample_query], n_results=1)
    if res["metadatas"] and res["metadatas"][0]:
        top = res["metadatas"][0][0]
        print(
            f"\nSmoke test  query: {sample_query!r}\n"
            f"  → top hit: [{top['section']}] {top['question']}"
        )


if __name__ == "__main__":
    main()
