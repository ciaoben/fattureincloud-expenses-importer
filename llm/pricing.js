import { toNullableNumber } from "./utils.js";

const LLM_PRICE_MODELS_API_URL = "https://llm-price.com/api/models";

const ANTHROPIC_MODEL_ALIASES = [
    { pattern: /claude-3[-.]5-sonnet/, modelId: "anthropic/claude-3.5-sonnet" },
    { pattern: /claude-3[-.]5-haiku/, modelId: "anthropic/claude-3.5-haiku" },
    { pattern: /claude-3[-.]7-sonnet/, modelId: "anthropic/claude-3.7-sonnet" },
    { pattern: /claude-sonnet-4\.6/, modelId: "anthropic/claude-sonnet-4.6" },
    { pattern: /claude-sonnet-4\.5/, modelId: "anthropic/claude-sonnet-4.5" },
    { pattern: /claude-sonnet-4(\.|-|$)/, modelId: "anthropic/claude-sonnet-4" },
];

function normalizeUnitPrice(value) {
    const parsed = toNullableNumber(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return null;
    }

    return parsed;
}

function normalizeRawModelName(model) {
    if (!model || typeof model !== "string") {
        return null;
    }

    return model
        .trim()
        .toLowerCase()
        .replace(/^models\//, "");
}

export function toLlmPriceModelId({ provider, model }) {
    const normalizedProvider = provider?.toLowerCase();
    const normalizedModel = normalizeRawModelName(model);
    if (!normalizedProvider || !normalizedModel) {
        return null;
    }

    if (normalizedProvider === "gemini") {
        return `google/${normalizedModel}`;
    }

    if (normalizedProvider === "anthropic") {
        for (const alias of ANTHROPIC_MODEL_ALIASES) {
            if (alias.pattern.test(normalizedModel)) {
                return alias.modelId;
            }
        }
        return `anthropic/${normalizedModel}`;
    }

    return null;
}

export async function fetchModelPricesById(modelIds) {
    const uniqueModelIds = [...new Set((modelIds || []).filter(Boolean))];
    if (uniqueModelIds.length === 0) {
        return {
            pricesByModelId: {},
            missingModelIds: [],
        };
    }

    const response = await fetch(LLM_PRICE_MODELS_API_URL, {
        method: "GET",
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`llm-price API error (${response.status})`);
    }

    const payload = await response.json();
    const models = Array.isArray(payload?.data) ? payload.data : [];
    const modelById = new Map(models.map((model) => [model.id, model]));

    const pricesByModelId = {};
    const missingModelIds = [];

    for (const modelId of uniqueModelIds) {
        const model = modelById.get(modelId);
        if (!model) {
            missingModelIds.push(modelId);
            continue;
        }

        pricesByModelId[modelId] = {
            prompt: normalizeUnitPrice(model?.pricing?.prompt),
            completion: normalizeUnitPrice(model?.pricing?.completion),
        };
    }

    return {
        pricesByModelId,
        missingModelIds,
    };
}
