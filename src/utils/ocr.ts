import { createWorker } from 'tesseract.js';

export async function extractTextFromImage(file: File): Promise<string> {
    const worker = await createWorker('eng');
    const ret = await worker.recognize(file);
    await worker.terminate();
    return ret.data.text;
}

export async function extractTextFromPDF(file: File): Promise<string> {
    // Dynamically import pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist');

    // Set worker source
    // Use local worker to avoid CDN issues/CORS/Version mismatch
    // Log to confirm execution
    console.log("Initializing PDF.js worker...");
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    // Fallback for different module Loading scenarios (Next.js ESM/CJS interop)
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc && (pdfjsLib as any).default) {
        (pdfjsLib as any).default.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }
    console.log("PDF.js workerSrc set to:", pdfjsLib.GlobalWorkerOptions.workerSrc || (pdfjsLib as any).default?.GlobalWorkerOptions?.workerSrc);

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    // Loop through pages
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        // Use 'str' from items. Note: items is strictly typed as TextItem | TextMarkedContent
        const pageText = textContent.items.map((item: { str: string } | any) => item.str || "").join(' ');
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }

    return fullText;
}

export async function convertFileToText(file: File): Promise<string> {
    if (file.type === 'application/pdf') {
        return extractTextFromPDF(file);
    } else if (file.type.startsWith('image/')) {
        return extractTextFromImage(file);
    } else {
        // For text files/others, try reading as text
        return await file.text();
    }
}
