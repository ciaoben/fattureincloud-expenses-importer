const toSafeLower = (value) => (typeof value === "string" ? value.toLowerCase() : "");

export const getTaxDeductibilityForExpense = (extractedData) => {
    const vendorName = toSafeLower(extractedData?.vendor_name);
    // electricity bills are 50% deductible
    if (vendorName.includes("octopus energy")) {
        return 50;
    }

    // rent is 50% deductible
    if (vendorName.includes("affitto")) {
        return 50;
    }

    if (vendorName.includes("eni plenitude")) {
        return 50;
    }

    if (vendorName.includes("pulsee")) {
        return 50;
    }

    return 100;
};

export const normalizeDescriptionForExpense = (extractedData) => {
    const originalDescription = extractedData.description;
    if (!originalDescription || typeof originalDescription !== "string") {
        return originalDescription;
    }

    const description = toSafeLower(originalDescription);
    const vendorName = toSafeLower(extractedData?.vendor_name);
    const hasExtraEu = description.includes("extraeu");
    const withExtraEuSuffix = (label) => (hasExtraEu ? `${label} - extraeu` : label);

    if (description.includes("affitto")) {
        return originalDescription;
    }

    const isGasBill = description.includes("bolletta gas") || description.includes("gas");
    if (isGasBill) {
        return withExtraEuSuffix("BOLLETTA GAS");
    }

    const isElectricityBill =
        vendorName.includes("octopus energy") ||
        description.includes("energia elettrica") ||
        description.includes("bolletta luce");
    if (isElectricityBill) {
        return withExtraEuSuffix("BOLLETTA LUCE");
    }

    return originalDescription;
};

export const getPaymentAccountForExpense = (extractedData) => {
    const description = toSafeLower(extractedData?.description);
    const vendorName = toSafeLower(extractedData?.vendor_name);

    if (vendorName.includes("octopus energy")) {
        return "Banco Popolare";
    }

    if (vendorName.includes("pulsee")) {
        return "Banco Popolare";
    }

    if (vendorName.includes("eni plenitude")) {
        return "Banco Popolare";
    }

    if (description.includes("affitto")) {
        return "Banco Popolare";
    }

    if (description.includes("pulsee")) {
        return "Banco Popolare";
    }

    if (description.includes("eni plenitude")) {
        return "Banco Popolare";
    }

    if (description.includes("bolletta luce")) {
        return "Banco Popolare";
    }

    if (description.includes("bolletta gas")) {
        return "Banco Popolare";
    }

    if (description.includes("energia elettrica")) {
        return "Banco Popolare";
    }

    return "Carta";
};

// return YYYY-MM-DD format
export const getPaymentDateForExpense = (extractedData) => {
    return extractedData.date;
};

export const pickCompany = (accountCompanies) => {
    return accountCompanies[0];
};
