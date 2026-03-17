export function extractJsonFromText(text) {
    if (!text || typeof text !== "string") {
        throw new Error("Model response does not contain text");
    }

    const startIndex = text.indexOf("{");
    const endIndex = text.lastIndexOf("}");

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        throw new Error("Could not find JSON object in model response");
    }

    const jsonString = text.slice(startIndex, endIndex + 1);

    try {
        return JSON.parse(jsonString);
    } catch {
        throw new Error("Failed to parse JSON from model response");
    }
}

export function toNullableNumber(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
}

export function sumDefinedNumbers(...values) {
    const numbers = values.filter((value) => Number.isFinite(value));
    if (numbers.length === 0) {
        return null;
    }

    return numbers.reduce((acc, value) => acc + value, 0);
}
