# 🛡️ Safe Harbour

Safe Harbour is a sophisticated AI-powered privacy platform designed to protect sensitive information during digital interactions. It combines modern web technologies with advanced natural language processing to detect and anonymize Personally Identifiable Information (PII) in real-time chat and document uploads.

## 🚀 Key Features

- **🤖 AI-Powered Chat**: Seamlessly interact with Google Gemini AI for intelligent conversations.
- **🛡️ Real-time PII Anonymization**: Automatically detects and masks sensitive data (names, emails, phones, etc.) before it reaches AI models.
- **📄 Document Processing**: Upload PDFs and images; the platform extracts text and applies privacy filters using OCR (Tesseract.js).
- **🔒 Secure Integration**: Built-in authentication and data management via Supabase.
- **🎨 Modern UI/UX**: Premium dark-mode interface with smooth animations (Framer Motion) and responsive design (Tailwind CSS).
- **📊 Interactive Visuals**: Dynamic global connectivity visualization using Cobe.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/) & [Motion](https://motion.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **UI Components**: Radix UI primitives

### Backend (Privacy Engine)
- **Language**: Python
- **Framework**: Flask
- **PII Detection**: [Microsoft Presidio](https://microsoft.github.io/presidio/)
- **NLP Models**: Spacy (`en_core_web_sm`)

### Services & AI
- **Database & Auth**: [Supabase](https://supabase.com/)
- **AI Model**: Google Gemini (via `@google/generative-ai`)
- **OCR**: [Tesseract.js](https://tesseract.projectnaptha.com/)

## 🏁 Getting Started

### Prerequisites
- Node.js 20+
- Python 3.9+
- Supabase Project
- Google Gemini API Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd safe-harbour
   ```

2. **Install Frontend Dependencies**:
   ```bash
   npm install
   ```

3. **Install Backend Dependencies**:
   ```bash
   cd api
   pip install -r requirements.txt
   python -m spacy download en_core_web_sm
   cd ..
   ```

4. **Environment Variables**:
   Create a `.env.local` file in the root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GOOGLE_API_KEY=your_gemini_api_key
   ```

### Running Locally

1. **Start the Frontend & Backend**:
   The Vercel CLI or running them separately works:
   ```bash
   # Terminal 1: Frontend
   npm run dev

   # Terminal 2: Backend (from api directory)
   python index.py
   ```

## 📂 Project Structure

- `/src/app`: Next.js pages and application logic.
- `/src/components`: Reusable UI components (Chat, Upload, Global Globe).
- `/api`: Python Flask backend for PII analysis and anonymization.
- `/public`: Static assets and icons.

## 🌐 API Endpoints (Privacy Service)

- `POST /api/anonymize`: Detects and masks PII in text.
- `POST /api/extract-text`: Processes documents and extracts content for analysis.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

