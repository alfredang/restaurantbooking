"""
FastAPI query server for the Dragon Gate FAQ chatbot.

Endpoints
    GET  /health         simple liveness probe
    POST /query          { "question": "..." } → { "answer": "...", ... }

Run:
    pip install -r requirements.txt
    uvicorn server:app --reload --port 8000

CORS is wide-open so the static `index.html` (opened via file:// or any
local dev server) can call it without extra setup.
"""

from __future__ import annotations

import os
from pathlib import Path

import chromadb
from chromadb.utils import embedding_functions
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

# Re-use the HF embedding function from ingest_faq.py so the query side
# uses the same model that produced the stored vectors.
from ingest_faq import HFInferenceRouterEmbedding

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT.parent / ".env")
load_dotenv(ROOT / ".env")

STORE_PATH = ROOT / "chroma_store"
COLLECTION_NAME = "dragon_gate_faq"
HF_API_KEY = os.environ.get("HF_API_KEY", "").strip()
HF_MODEL = os.environ.get(
    "HF_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
)
# Cosine distance below this counts as a real hit. all-MiniLM returns
# values roughly in [0, 1]; ~0.9 corresponds to "weakly related".
RELEVANCE_MAX_DISTANCE = 0.9


def build_embedding_fn():
    if HF_API_KEY:
        return HFInferenceRouterEmbedding(api_key=HF_API_KEY, model_name=HF_MODEL)
    return embedding_functions.DefaultEmbeddingFunction()


client = chromadb.PersistentClient(path=str(STORE_PATH))
collection = client.get_collection(
    name=COLLECTION_NAME,
    embedding_function=build_embedding_fn(),
)

app = FastAPI(title="Dragon Gate FAQ Bot", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryIn(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)


class QueryOut(BaseModel):
    answer: str
    question: str
    section: str
    distance: float
    confident: bool


LANDING_HTML = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Dragon Gate · FAQ Bot API</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;
       max-width:680px;margin:4rem auto;padding:0 1.5rem;
       color:#1A1413;background:#FBF7F0;line-height:1.65}
  h1{font-family:Georgia,serif;font-style:italic;color:#9E1B1B;margin:0 0 .3rem}
  .tag{color:#888;letter-spacing:.18em;text-transform:uppercase;
       font-size:.72rem;margin:0 0 2rem}
  code{background:#fff;border:1px solid #ddd;padding:.15rem .4rem;
       border-radius:3px;font-size:.9em}
  pre{background:#fff;border:1px solid #ddd;padding:1rem;border-radius:4px;
      overflow-x:auto;font-size:.85em}
  .pill{display:inline-block;padding:.15rem .55rem;border-radius:3px;
        font-weight:600;font-size:.75rem;letter-spacing:.05em}
  .get{background:#E6F3E6;color:#226633}
  .post{background:#FFF1E0;color:#A65C00}
  a{color:#9E1B1B}
  ul{padding-left:1.2rem}
</style>
</head>
<body>
<h1>Dragon Gate · 龙门</h1>
<p class="tag">FAQ Bot API</p>

<p>This is the backend API that powers the concierge chatbot on the
restaurant site. It serves answers from a ChromaDB vector store of the
restaurant FAQ, embedded with HuggingFace's
<code>sentence-transformers</code> model.</p>

<h3>Endpoints</h3>
<ul>
  <li><span class="pill get">GET</span>
      <a href="/health"><code>/health</code></a>
      — collection name and document count.</li>
  <li><span class="pill get">GET</span>
      <a href="/docs"><code>/docs</code></a>
      — interactive Swagger UI (try queries from the browser).</li>
  <li><span class="pill post">POST</span> <code>/query</code>
      — body <code>{"question": "..."}</code> → best-matching FAQ answer.</li>
</ul>

<h3>Quick test</h3>
<pre>curl -X POST http://127.0.0.1:8000/query \\
  -H "Content-Type: application/json" \\
  -d '{"question": "What are your opening hours?"}'</pre>

<p>To chat normally, open <code>index.html</code> in your browser and
click the red bubble in the bottom-right corner.</p>
</body>
</html>"""


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def landing() -> str:
    return LANDING_HTML


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "collection": COLLECTION_NAME, "count": collection.count()}


@app.post("/query", response_model=QueryOut)
def query(req: QueryIn) -> QueryOut:
    try:
        res = collection.query(query_texts=[req.question], n_results=1)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Vector store error: {e}")

    metas = res.get("metadatas") or [[]]
    dists = res.get("distances") or [[]]
    if not metas[0]:
        raise HTTPException(status_code=404, detail="No documents in collection")

    meta = metas[0][0]
    distance = float(dists[0][0]) if dists[0] else 1.0
    confident = distance <= RELEVANCE_MAX_DISTANCE

    return QueryOut(
        answer=meta.get("answer", ""),
        question=meta.get("question", ""),
        section=meta.get("section", ""),
        distance=distance,
        confident=confident,
    )
