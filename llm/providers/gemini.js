import safe from "safe-await";
import { extractJsonFromText, toNullableNumber, sumDefinedNumbers } from "../utils.js";

const DEFAULT_MODEL = "gemini-2.5-flash";

export async function extractWithGemini({ pdfBuffer, prompt }) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is required when LLM_PROVIDER=gemini");
    }

    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = {
        contents: [
            {
                parts: [
                    {
                        inline_data: {
                            mime_type: "application/pdf",
                            data: pdfBuffer.toString("base64"),
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            },
        ],
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0,
        },
    };

    const [requestError, response] = await safe(
        fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        })
    );

    if (requestError) {
        throw requestError;
    }

    const [payloadError, payload] = await safe(response.json());

    if (payloadError) {
        throw new Error("Failed to parse Gemini API response");
    }

    if (!response.ok) {
        throw new Error(`Gemini API error (${response.status}): ${payload?.error?.message || "Unknown error"}`);
    }

    const text = payload?.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === "string")?.text;
    const parsedData = extractJsonFromText(text);
    const usageMetadata = payload?.usageMetadata || {};
    const inputTokens = toNullableNumber(usageMetadata.promptTokenCount);
    const outputTokens = toNullableNumber(usageMetadata.candidatesTokenCount);
    const totalTokens = toNullableNumber(usageMetadata.totalTokenCount) ?? sumDefinedNumbers(inputTokens, outputTokens);

    return {
        data: parsedData,
        usage: {
            provider: "gemini",
            model,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            total_tokens: totalTokens,
            thoughts_tokens: toNullableNumber(usageMetadata.thoughtsTokenCount),
            cached_content_tokens: toNullableNumber(usageMetadata.cachedContentTokenCount),
        },
    };
}
