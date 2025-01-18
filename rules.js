export const getTaxDeductibilityForExpense = (extractedData) => {
    const vendorName = extractedData.vendor_name.toLowerCase();
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

export const getPaymentAccountForExpense = (extractedData) => {
    const description = extractedData.description.toLowerCase();
    const vendorName = extractedData.vendor_name.toLowerCase();

    if (vendorName.includes("octopus energy")) {
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

    return "Carta";
};

// return YYYY-MM-DD format
export const getPaymentDateForExpense = (extractedData) => {
    return extractedData.date;
};

export const pickCompany = (accountCompanies) => {
    return accountCompanies[0];
};
