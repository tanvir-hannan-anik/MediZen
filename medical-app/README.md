# MediZen — Full-Stack AI Medical Assistant

A complete AI-powered medical assistant web application using RAG (Retrieval-Augmented Generation) with the Gale Encyclopedia of Medicine.

## Features

| Feature | Description |
|---------|-------------|
| AI Chat | RAG-powered Q&A from the medical encyclopedia |
| Image Analysis | Upload X-rays / skin photos → AI diagnosis |
| Prescription | OCR + AI extraction of medicines & dosage |
| Lab Report | Parse CBC/blood tests, highlight abnormal values |
| Disease Insight | Structured overview of any condition |
| Nearby Services | Map of hospitals, clinics, pharmacies in Dhaka |
| Blood Donor | Register/search donors by blood group & location |
| User Profile | History, settings, blood group, donor status |
| Auth | JWT email/password authentication |

---

## Quick Start

### 1. Prerequisites

- Python 3.10+
- Node.js 18+
- Tesseract OCR (for prescription/report analysis):
  - Windows: https://github.com/UB-Mannheim/tesseract/wiki
  - Install to `C:\Program Files\Tesseract-OCR\`

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY

# Ingest the medical PDF (run once, takes ~5-10 min)
python ingest.py

# Start the server
uvicorn main:app --reload --port 8000
```

Backend API: http://localhost:8000  
API docs: http://localhost:8000/docs

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open: http://localhost:5173

---

## Environment Variables (`backend/.env`)

```env
ANTHROPIC_API_KEY=sk-ant-...        # Required for AI features
SECRET_KEY=your-random-secret-key   # JWT signing key
PDF_PATH=../gale-encyclopedia-of-medicine.-vol.-1.-2nd-ed.pdf
VECTOR_STORE_DIR=./vector_store
TESSERACT_CMD=C:/Program Files/Tesseract-OCR/tesseract.exe
```

---

## Architecture

```
medical-app/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── ingest.py                # PDF → FAISS index builder
│   ├── routers/
│   │   ├── auth.py              # JWT register/login
│   │   ├── chat.py              # RAG chat endpoints
│   │   ├── upload.py            # File upload & analysis
│   │   ├── donors.py            # Blood donor CRUD
│   │   └── nearby.py            # Nearby services lookup
│   ├── services/
│   │   ├── rag_service.py       # FAISS + embeddings + Claude
│   │   └── ocr_service.py       # OCR + vision analysis
│   └── models/
│       ├── database.py          # SQLAlchemy + SQLite
│       └── models.py            # User, Chat, Upload, Donor
└── frontend/
    └── src/
        ├── App.jsx              # Router + layout
        ├── pages/               # 9 feature pages
        ├── components/          # Sidebar, Topbar, FileUpload
        ├── api/client.js        # Axios API client
        └── context/AuthContext  # Auth state
```

## RAG Pipeline

1. **Ingest** (`ingest.py`): PDF → chunks → embeddings (all-MiniLM-L6-v2) → FAISS index
2. **Retrieve**: User query → embed → top-5 chunks from FAISS
3. **Generate**: Chunks + query → Claude (claude-haiku) → answer with confidence

## AI Models Used

- **Embeddings**: `sentence-transformers/all-MiniLM-L6-v2` (local, free)
- **LLM**: `claude-haiku-4-5-20251001` via Anthropic API
- **Vision**: `claude-haiku-4-5-20251001` for image/prescription analysis
- **OCR**: `pytesseract` for text extraction

## Medical Disclaimer

This system provides health information for educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional.
