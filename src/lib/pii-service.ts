export type PIIType = 'NAME' | 'EMAIL' | 'PHONE' | 'CREDIT_CARD' | 'SSN' | 'IP_ADDRESS';

export interface PIIFinding {
    type: PIIType;
    value: string;
    index: number;
}

export interface PIIResult {
    anonymizedText: string;
    originalMap: Record<string, string>; // placeholder -> original value
    findings: PIIType[];
}

// Regex Patterns (Fallback)
const PATTERNS: Record<PIIType, RegExp> = {
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    PHONE: /(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    CREDIT_CARD: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
    SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
    IP_ADDRESS: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    // Name detection is hard without NLP. We'll use a heuristic for Capitalized Words that are not at start of sentence?
    // Or maybe just look for common patterns.
    // For this "Safe Harbour" demo, we can just use the explicit "Ahmed" example if we wanted, 
    // but let's try a simple heuristic: 2+ Capitalized words.
    // OR, user said "place holders (ex. Ahmed -< [name])". 
    // Real detection needs NLP. I'll include a placeholder Regex for "Name-like" patterns if possible, 
    // or focus on the rigorous types above which are standard PII. 
    // I will add a simple "Proper Noun" heuristic but it might be noisy. 
    // Let's stick to rigorous types first, and maybe "Name" if it looks like "Ahmed". 
    // I'll add a specific check for "Ahmed" for the demo purposes as requested? 
    // "place holders (ex. Ahmed -< [name])". 
    // I'll add a generic Proper Noun detector for words starting with Capital letter inside sentence.
    NAME: /(?<!^)(?<!\. )[A-Z][a-z]+ [A-Z][a-z]+/g // Very basic heuristic: First Last (not at start of sentence)
};

export class PIIService {
    static getAnonymizeUrl() {
        if (typeof window !== "undefined") {
            return "/api/anonymize"; // Client side: usage relative path
        }
        // Server side (Node.js) requires absolute URL
        if (process.env.VERCEL_URL) {
            return `https://${process.env.VERCEL_URL}/api/anonymize`;
        }
        return "http://127.0.0.1:5000/anonymize"; // Local fallback
    }

    static async anonymize(text: string): Promise<PIIResult> {
        // 1. Try Presidio Backend
        try {
            const response = await fetch(PIIService.getAnonymizeUrl(), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
                signal: AbortSignal.timeout(3000) // 3s timeout
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    anonymizedText: data.anonymizedText,
                    originalMap: data.originalMap,
                    findings: data.findings
                };
            }
        } catch (e) {
            console.warn("Presidio Backend failed/unreachable. Falling back to Regex.", e);
        }

        // 2. Fallback to Regex Logic
        let anonymizedText = text;
        const originalMap: Record<string, string> = {};
        const findings: Set<PIIType> = new Set();
        const counters: Record<PIIType, number> = {
            NAME: 0, EMAIL: 0, PHONE: 0, CREDIT_CARD: 0, SSN: 0, IP_ADDRESS: 0
        };

        // Process each pattern
        (Object.keys(PATTERNS) as PIIType[]).forEach((type) => {
            const regex = PATTERNS[type];
            const matches = text.match(regex);

            if (matches) {
                findings.add(type);
                matches.forEach((match) => {
                    // If already replaced (e.g. part of another match), skip?
                    // Simple replacement strategy:
                    const placeholder = `[${type}_${counters[type] + 1}]`;
                    if (!originalMap[placeholder]) { // avoid double replacing if same value appears twice? 
                        // actually unique placeholders are safer for restoration
                    }

                    // But if the same email appears twice, we should probably use same placeholder?
                    // Let's check if value already mapped
                    let existingPlaceholder = Object.keys(originalMap).find(key => originalMap[key] === match);

                    if (!existingPlaceholder) {
                        existingPlaceholder = placeholder;
                        originalMap[existingPlaceholder] = match;
                        counters[type]++;
                    }

                    // Use replaceAll to ensure all instances are swapped
                    // We need to escape the match string for regex usage in replace (if it has special chars like +)
                    // Or just split/join which is safer for literal string replacement
                    anonymizedText = anonymizedText.split(match).join(existingPlaceholder);
                });
            }
        });

        return {
            anonymizedText,
            originalMap,
            findings: Array.from(findings)
        };
    }

    static restore(text: string, map: Record<string, string>): string {
        let restoredText = text;
        Object.keys(map).forEach((placeholder) => {
            restoredText = restoredText.split(placeholder).join(map[placeholder]);
        });
        return restoredText;
    }
}
