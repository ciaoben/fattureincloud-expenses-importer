import { extractWithAnthropic } from "./providers/anthropic.js";
import { extractWithGemini } from "./providers/gemini.js";

const PROVIDER_ANTHROPIC = "anthropic";
const PROVIDER_GEMINI = "gemini";
const DEFAULT_PROVIDER = PROVIDER_ANTHROPIC;

const providers = {
    [PROVIDER_ANTHROPIC]: extractWithAnthropic,
    [PROVIDER_GEMINI]: extractWithGemini,
};

export function getActiveProvider() {
    const provider = (process.env.LLM_PROVIDER || DEFAULT_PROVIDER).toLowerCase();

    if (!providers[provider]) {
        throw new Error(
            `Unsupported LLM_PROVIDER "${provider}". Supported values: ${Object.keys(providers).join(", ")}`
        );
    }

    return provider;
}

export async function extractInvoiceFromPdf({ pdfBuffer, prompt }) {
    const provider = getActiveProvider();
    return providers[provider]({ pdfBuffer, prompt });
}
