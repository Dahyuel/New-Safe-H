# Safe Harbour

A privacy-first AI chat interface that detects and anonymizes Personally Identifiable Information (PII) before sending messages to a large language model. Sensitive values are replaced with placeholders, the sanitized prompt is sent to the model, and the original values are restored in the response locally.

## Overview

Safe Harbour combines a React + TypeScript single-page application with a Python PII detection backend. Incoming user input is analyzed with Microsoft Presidio (spaCy `en_core_web_sm` NLP engine). Detected entities such as names, phone numbers, emails, locations, and credit cards are swapped for numbered placeholders (for example `[PERSON_1]`, `[EMAIL_ADDRESS_1]`). Only the anonymized text leaves the browser. Responses are then deanonymized client-side using the placeholder map, so the user sees their real data while the model never does.

## Features

- Real-time PII detection and anonymization via Presidio
- Placeholder mapping with unique, numbered tokens per entity type
- Round-trip deanonymization of model responses
- AI chat powered by Google Gemini, with a system instruction that preserves placeholders
- On-screen PII alerts listing which entity types were detected
- Client-side caching layer for repeated lookups
- Animated, glassmorphism UI with WebGL backgrounds (Plasma, Silk) and GSAP transitions
- Responsive navigation with desktop and mobile menus
- Static pages for Home, About, Contact, Login, and Signup
- Routing via React Router

## Architecture

```
Safe-H/
├── src/                        # React frontend
│   ├── components/             # UI components (ChatPage, HomePage, Plasma, menus, auth cards)
│   ├── utils/                  # Gemini client, PII helpers, cache manager
│   ├── App.tsx                 # Route definitions
│   └── main.tsx                # App entry point
├── backend/                    # Flask backend (local development)
│   ├── app.py                  # REST API: /analyze, /anonymize, /deanonymize, /health
│   ├── presidio_service.py     # Presidio analyzer + anonymizer wrapper
│   └── requirements.txt
├── api/                        # Serverless functions (Vercel / Netlify)
│   ├── analyze_and_anonymize.py
│   ├── health.py
│   ├── index.py
│   └── requirements.txt
├── public/                     # Static assets
├── index.html
├── vite.config.ts              # Vite config with /api proxy to backend
├── vercel.json                 # Vercel routing config
└── netlify.toml                # Netlify redirect config
```

Request flow:

1. User submits a message in `ChatPage`.
2. The message is POSTed to `/api/analyze_and_anonymize`.
3. Presidio returns anonymized text plus a placeholder-to-original mapping.
4. The anonymized text is sent to Gemini.
5. The model response is deanonymized with the mapping and rendered in the chat.

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React 18, TypeScript, Vite, React Router, Tailwind CSS |
| Animation / 3D | GSAP, Three.js, `@react-three/fiber`, OGL |
| Icons | lucide-react |
| HTTP | axios |
| AI | `@google/generative-ai` (Gemini) |
| Backend | Python, Flask, Flask-CORS |
| PII | Microsoft Presidio (analyzer + anonymizer), spaCy `en_core_web_sm` |
| Deployment | Vercel, Netlify |

## Prerequisites

- Node.js 18 or newer
- Python 3.9 or newer
- A Google Gemini API key

## Installation

### Frontend

```bash
npm install
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

## Configuration

Create a `.env` file in the project root (and reference it from the backend) with the values your deployment needs:

```env
GEMINI_API_KEY=your_gemini_api_key
PORT=3001
FLASK_ENV=development
```

The frontend reads its Gemini key from the environment when configured through your build or deployment platform. Keep keys out of source control.

## Usage

### Run the frontend only

```bash
npm run dev
```

Vite serves the app at `http://localhost:5173` and proxies `/api` requests to `http://localhost:3001`.

### Run the backend

```bash
cd backend
python app.py
```

The Flask API listens on port `3001` by default.

### Run both together

```bash
npm run dev:all
```

This launches the Vite dev server and the Python backend in one process.

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Service status and analyzer readiness |
| POST | `/api/analyze_and_anonymize` | Detect and anonymize PII in the supplied text |
| POST | `/api/anonymize` | Anonymize text using analyzer results |
| POST | `/api/deanonymize` | Restore original values from a placeholder map |

Example request:

```bash
curl -X POST http://localhost:3001/api/analyze_and_anonymize \
  -H "Content-Type: application/json" \
  -d '{"text": "My name is Jane Doe and my email is jane@example.com"}'
```

Example response:

```json
{
  "anonymizedText": "My name is [PERSON_1] and my email is [EMAIL_ADDRESS_1]",
  "detectedPii": {
    "[PERSON_1]": "Jane Doe",
    "[EMAIL_ADDRESS_1]": "jane@example.com"
  },
  "entityCount": 2
}
```

## Development

### Available scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server |
| `npm run dev:all` | Start frontend and backend together |
| `npm run build` | Produce a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint over the project |

### Linting

```bash
npm run lint
```

### Type checking

```bash
npx tsc --noEmit -p tsconfig.app.json
```

## Deployment

### Vercel

The `api/` directory contains Python serverless functions. `vercel.json` builds the Vite output and rewrites all non-API routes to `index.html`.

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Netlify

`netlify.toml` builds the frontend and redirects `/api/*` to the deployed backend functions. Update the redirect target to point at your backend site.

Additional deployment notes live in `DEPLOYMENT.md`, `DEPLOYMENT_STEPS.md`, `README_DEPLOYMENT.md`, and `VERCEL_DEPLOYMENT.md`.

## Security Notes

- PII is detected and replaced before any text is sent to the language model.
- The placeholder map is kept client-side and used only for local deanonymization.
- API keys must be supplied through environment variables and never committed.
- CORS on the Flask backend is restricted to the configured development origins.

## Supported PII Entity Types

Safe Harbour relies on Presidio's supported entity set, which includes:

- `PERSON` - names
- `EMAIL_ADDRESS` - email addresses
- `PHONE_NUMBER` - phone numbers
- `CREDIT_CARD` - card numbers
- `LOCATION` - places and addresses
- `DATE_TIME` - dates and times
- `IBAN_CODE`, `IP_ADDRESS`, `URL`, and other built-in recognizers

The full list is available at runtime from the health endpoint.

## License

No license file is included in this repository. Add one before distributing the project.

## Acknowledgments

- [Microsoft Presidio](https://microsoft.github.io/presidio/) for PII detection and anonymization
- [spaCy](https://spacy.io/) for NLP
- [Google Gemini](https://ai.google.dev/) for the language model
- [Vite](https://vitejs.dev/), [React](https://react.dev/), and [Tailwind CSS](https://tailwindcss.com/) for the frontend stack
