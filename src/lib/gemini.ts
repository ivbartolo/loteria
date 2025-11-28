import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Extract the main lottery number from a lottery ticket image using Gemini Vision API
 * @param imageFile - The image file to process
 * @returns Promise<string | null> - The extracted 5-digit number or null if not found
 */
export async function extractLotteryNumber(imageFile: File): Promise<string | null> {
    try {
        // Get API key from environment
        const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

        if (!apiKey) {
            console.error("VITE_GOOGLE_API_KEY not found in environment variables");
            throw new Error("Google API key not configured. Please add VITE_GOOGLE_API_KEY to your .env file");
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        // Convert image to base64
        const imageData = await fileToGenerativePart(imageFile);

        // Create prompt for lottery number extraction
        const prompt = `Analiza esta imagen de un billete de lotería español (Lotería Nacional de Navidad).

IMPORTANTE: Debes extraer ÚNICAMENTE el número principal del décimo, que es un número de 5 dígitos que aparece destacado en grande en el billete.

NO extraigas:
- Números del código de barras (suelen ser secuencias largas de más de 10 dígitos)
- El número de fracción (aparece como "5ª FRACCIÓN" o similar)
- El número de serie (aparece como "102/25" o similar)
- El precio (20 euros)
- La fecha

El número que debes extraer es el número principal del décimo, que aparece en grande y es de exactamente 5 dígitos.

Responde ÚNICAMENTE con el número de 5 dígitos, sin ningún otro texto, explicación o formato adicional.
Si no encuentras un número de 5 dígitos que sea claramente el número principal del décimo, responde con "ERROR".`;

        // Call Gemini API
        const result = await model.generateContent([prompt, imageData]);
        const response = await result.response;
        const text = response.text().trim();

        console.log("Gemini OCR response:", text);

        // Validate response
        if (text === "ERROR" || !text) {
            console.warn("Gemini could not extract lottery number");
            return null;
        }

        // Extract only digits and validate it's exactly 5 digits
        const numberMatch = text.match(/\d{5}/);
        if (!numberMatch) {
            console.warn("Gemini response doesn't contain a valid 5-digit number:", text);
            return null;
        }

        const extractedNumber = numberMatch[0];
        console.log("✅ Lottery number extracted by Gemini:", extractedNumber);

        return extractedNumber;

    } catch (error) {
        console.error("Error in Gemini OCR:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to extract lottery number: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Convert a File to a GenerativePart for Gemini API
 */
async function fileToGenerativePart(file: File): Promise<{
    inlineData: { data: string; mimeType: string };
}> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onloadend = () => {
            if (reader.result && typeof reader.result === 'string') {
                // Remove data URL prefix (e.g., "data:image/png;base64,")
                const base64Data = reader.result.split(',')[1];
                resolve({
                    inlineData: {
                        data: base64Data,
                        mimeType: file.type,
                    },
                });
            } else {
                reject(new Error("Failed to read file"));
            }
        };

        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}
