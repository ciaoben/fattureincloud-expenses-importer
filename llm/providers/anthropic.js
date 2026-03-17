import { Anthropic } from "@anthropic-ai/sdk";
import safe from "safe-await";
import { extractJsonFromText, toNullableNumber, sumDefinedNumbers } from "../utils.js";

const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";

export async function extractWithAnthropic({ pdfBuffer, prompt }) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic");
    }

    const anthropic = new Anthropic({ apiKey });

    const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

    const [messageError, message] = await safe(
        anthropic.messages.create(
            {
                model,
                max_tokens: 2048,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "document",
                                source: {
                                    type: "base64",
                                    media_type: "application/pdf",
                                    data: pdfBuffer.toString("base64"),
                                },
                            },
                            {
                                type: "text",
                                text: prompt,
                            },
                        ],
                    },
                ],
            },
            {
                headers: {
                    "anthropic-beta": "pdfs-2024-09-25",
                },
            }
        )
    );

    if (messageError) {
        throw messageError;
    }

    const text = message?.content?.find((part) => typeof part.text === "string")?.text;
    const parsedData = extractJsonFromText(text);
    const usage = message?.usage || {};

    const inputTokens = toNullableNumber(usage.input_tokens);
    const outputTokens = toNullableNumber(usage.output_tokens);
    const totalTokens = toNullableNumber(usage.total_tokens) ?? sumDefinedNumbers(inputTokens, outputTokens);

    return {
        data: parsedData,
        usage: {
            provider: "anthropic",
            model,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            total_tokens: totalTokens,
            cache_creation_input_tokens: toNullableNumber(usage.cache_creation_input_tokens),
            cache_read_input_tokens: toNullableNumber(usage.cache_read_input_tokens),
        },
    };
}
