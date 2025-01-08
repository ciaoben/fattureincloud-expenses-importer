export const getTaxDeductibilityForExpense = (extractedData) => {
    // electricity bills are 50% deductible
    if (extractedData.description.includes("Octopus Energy")) {
        return 50;
    }

    // rent is 50% deductible
    if (extractedData.description.includes("AFFITTO")) {
        return 50;
    }

    return 100;
};

export const getPaymentAccountForExpense = (extractedData) => {
    if (extractedData.description.includes("Octopus Energy")) {
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
