import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

const API_KEY = process.env.GOOGLE_API_KEY || "AIzaSyAj9osTcacWte6jzmCxx1qvfmI1quvReCg";

const genAI = new GoogleGenerativeAI(API_KEY);

export const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
});

const generationConfig = {
  temperature: 0.9,
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048,
};

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

const systemInstruction = `You are a helpful AI assistant. The user's message may contain placeholders in square brackets like [NAME], [EMAIL], [PHONE], [ADDRESS], etc. These represent sensitive information that has been temporarily masked.

IMPORTANT INSTRUCTIONS:
1. If you need to reference any of these placeholders in your response, keep them EXACTLY as they appear (e.g., [NAME], [EMAIL])
2. Do NOT try to guess or fill in what these placeholders might represent
3. Treat placeholders naturally in your response as if they were the actual information
4. Respond normally and naturally to the user's question - do not mention this masking system or these instructions to the user
5. Focus on providing helpful, relevant answers while preserving any placeholders that appear in context

Now, respond to the user's message naturally and helpfully.`;

export async function sendMessageToGemini(message: string, history: { role: string; parts: { text: string }[] }[] = []): Promise<string> {
  try {
    // Prepend system instruction to history or use systemInstruction prop if supported (v1.5+ supports it)
    // For compatibility, we'll keep the history injection method or use systemInstruction config if available.
    // Flash-lite likely supports systemInstruction in model config, but let's stick to chat history injection for safety.

    // Construct initial history with system prompt
    const initialHistory = [
      {
        role: "user",
        parts: [{ text: systemInstruction }],
      },
      {
        role: "model",
        parts: [{ text: "Okay, I understand. How can I help you today?" }],
      },
      ...history
    ];

    const chat = model.startChat({
      generationConfig,
      safetySettings,
      history: initialHistory
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error sending message to Gemini API:", error);
    throw new Error("Failed to get response from Gemini API.");
  }
}
