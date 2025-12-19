# Deployment Guide: Safe Harbour on Vercel

This guide will help you deploy the **Safe Harbour** application to Vercel.

## 1. Prerequisites

- A **GitHub Account**.
- A **Vercel Account** (linked to GitHub).
- The project uploaded to a GitHub Repository.

## 2. Prepare Your Repository

### A. Upload to GitHub
1.  Initialize/Update git:
    ```bash
    git add .
    git commit -m "Ready for deployment"
    ```
2.  Push to your GitHub repository.

### B. Verify Files
Ensure these files are present (we configured them for you):
-   `vercel.json`: Routes `/api/anonymize` and `/api/extract-text` to the Python backend.
-   `api/index.py`: Entry point for Vercel Serverless Function.
-   `api/requirements.txt`: Includes `flask`, `presidio`, `pypdf`, `spacy` model.

## 3. Deploy on Vercel

1.  Go to [Vercel Dashboard](https://vercel.com/dashboard).
2.  **Add New...** -> **Project**.
3.  Import `safe-harbour`.
4.  **Configure Project**:
    *   **Framework Preset**: Next.js (Auto-detected).
    *   **Root Directory**: Leave as `./`.

5.  **Environment Variables (Crucial)**:
    Add these in the Vercel UI:
    
    | Variable Name | Value |
    | :--- | :--- |
    | `NEXT_PUBLIC_SUPABASE_URL` | `https://klxqgpslwutqwdmvckjp.supabase.co` |
    | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(Your Anon Key)* |
    | `GOOGLE_API_KEY` | *(Your Gemini API Key)* |

6.  Click **Deploy**.

## 4. Verification

Once deployed:
1.  **Chat**: Send a message.
2.  **PII**: Type a phone number ("555-123-4567"). The backend should detect it.
3.  **PDF Upload**: Upload a PDF. The backend (`/api/extract-text`) should process it and return the text.

## 5. Troubleshooting

- **Serverless Function Size**: If deployment fails due to size, check `api/requirements.txt`. We use the small Spacy model (`en_core_web_sm`) to stay within limits.
- **500 Errors on PDF**: Check Vercel Function Logs. If dependencies failed to install, you might need to redeploy or check build logs.
