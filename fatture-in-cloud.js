import axios from "axios";
import safe from "safe-await";
import FormData from "form-data";

// Configuration
const config = {
    token: process.env.FATTURE_IN_CLOUD_TOKEN,
    apiBaseUrl: "https://api-v2.fattureincloud.it",
};

/**
 * Preconfigured axios instance for Fatture in Cloud API
 * @type {import('axios').AxiosInstance}
 */
const api = axios.create({
    baseURL: config.apiBaseUrl,
    headers: {
        Authorization: `Bearer ${config.token}`,
    },
});

/**
 * Lists all companies for the authenticated user
 * @returns {Promise<Object>} Response containing company data
 */
export async function listCompanies() {
    const [error, response] = await safe(api.get("/user/companies"));

    if (error) {
        console.error("Error listing companies:", error.response?.data || error.message);
        throw error;
    }

    return response.data;
}

/**
 * Lists received documents for a company
 * @param {string} companyId - The company ID
 * @param {string} [type="expense"] - The document type
 * @param {number} [page=1] - Page number
 * @param {number} [perPage=50] - Items per page
 * @returns {Promise<Object>} Response containing documents data
 */
export async function listReceivedDocuments(companyId, type = "expense", page = 1, perPage = 50) {
    const [error, response] = await safe(
        api.get(`/c/${companyId}/received_documents`, {
            params: { type, page, per_page: perPage },
        })
    );

    if (error) {
        console.error("Error listing received documents:", error.response?.data || error.message);
        throw error;
    }

    return response.data;
}

/**
 * Creates a received document in Fatture in Cloud
 * @param {string} companyId - The company ID
 * @param {Object} documentData - The document data to create
 * @returns {Promise<Object>} The created document data
 */
export async function createReceivedDocument(companyId, documentData) {
    const [error, response] = await safe(api.post(`/c/${companyId}/received_documents`, { data: documentData }));

    if (error) {
        console.error("Error creating received document:", error.response?.data || error.message);
        throw error;
    }

    return response.data;
}

/**
 * Uploads a document attachment and returns the attachment token
 * @param {string} companyId - The company ID
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} filename - The name of the file
 * @returns {Promise<string>} The attachment token
 */
export async function uploadAttachment(companyId, fileBuffer, filename) {
    const formData = new FormData();
    formData.append("attachment", fileBuffer, filename);
    formData.append("filename", filename);

    const [error, response] = await safe(
        api.post(`/c/${companyId}/received_documents/attachment`, formData, {
            headers: {
                ...formData.getHeaders(),
                "Content-Type": "multipart/form-data",
            },
        })
    );

    if (error) {
        console.error("Error uploading attachment:", error.response?.data || error.message);
        throw error;
    }

    return response.data.data.attachment_token;
}

/**
 * Finds a supplier by searching through all suppliers using a specified field
 * @param {string} companyId - The ID of the company
 * @param {string} searchValue - The value to search for
 * @param {string} [searchField="vat_number"] - The field to search on
 * @returns {Promise<Object|null>} The found supplier or null
 */
export async function findSupplier(companyId, searchValue, searchField = "vat_number") {
    const [error, response] = await safe(
        api.get(`/c/${companyId}/entities/suppliers`, {
            params: {
                per_page: 50,
                page: 1,
            },
        })
    );

    if (error) {
        console.error("Error finding supplier:", error.response?.data || error.message);
        throw error;
    }

    const suppliers = response.data.data;
    const found = suppliers.find(
        (supplier) => supplier[searchField] && supplier[searchField].toLowerCase() === searchValue.toLowerCase()
    );

    return found || null;
}

/**
 * Creates a new supplier for the specified company
 * @param {string} companyId - The ID of the company
 * @param {Object} supplierData - The supplier data to create
 * @returns {Promise<Object|null>} The created supplier or null if error
 */
export async function createSupplier(companyId, supplierData) {
    const [error, response] = await safe(
        api.post(`/c/${companyId}/entities/suppliers`, {
            data: supplierData,
        })
    );

    if (error) {
        console.error("Error creating supplier:", error.response?.data || error.message);
        throw error;
    }

    return response.data.data;
}

/**
 * Gets an existing supplier or creates a new one
 * @param {string} companyId - The ID of the company
 * @param {Object} supplierDetails - The supplier details
 * @param {string} [supplierDetails.vat_number] - The supplier's VAT number
 * @param {string} supplierDetails.name - The supplier's name
 * @returns {Promise<Object>} {new: true, supplier: supplier} if a new supplier was created
 */
export async function getOrCreateSupplier(companyId, supplierDetails) {
    let result = { new: false, supplier: null };

    if (supplierDetails.vat_number) {
        const [vatError, vatSupplier] = await safe(findSupplier(companyId, supplierDetails.vat_number, "vat_number"));
        if (vatError) {
            console.error("Error finding supplier by VAT:", vatError);
            throw vatError;
        }
        result.supplier = vatSupplier;
    }

    if (!result.supplier && supplierDetails.name) {
        const [nameError, nameSupplier] = await safe(findSupplier(companyId, supplierDetails.name, "name"));
        if (nameError) {
            console.error("Error finding supplier by name:", nameError);
            throw nameError;
        }
        result.supplier = nameSupplier;
    }

    if (!result.supplier) {
        const [createError, newSupplier] = await safe(createSupplier(companyId, supplierDetails));
        if (createError) {
            console.error("Error creating supplier:", createError);
            throw createError;
        }
        result.new = true;
        result.supplier = newSupplier;
    }

    return result;
}

/**
 * Fetches available currencies from Fatture in Cloud
 * @returns {Promise<Array>} List of available currencies
 */
export async function listCurrencies() {
    const [error, response] = await safe(api.get("/info/currencies"));

    if (error) {
        console.error("Error listing currencies:", error.response?.data || error.message);
        throw error;
    }

    return response.data.data;
}

/**
 * Finds currency details by currency code
 * @param {string} currencyCode - The currency code to find (e.g., 'EUR', 'USD')
 * @returns {Promise<Object|null>} Currency object or null if not found
 */
export async function findCurrency(currencyCode) {
    const currencies = await listCurrencies();
    return currencies.find((curr) => curr.id === currencyCode.toUpperCase()) || null;
}

/**
 * Fetches available payment methods from Fatture in Cloud
 * @param {string} companyId - The company ID
 * @returns {Promise<Array>} List of available payment methods
 */
export async function listPaymentAccounts(companyId) {
    const [error, response] = await safe(api.get(`/c/${companyId}/settings/payment_accounts`));

    if (error) {
        console.error("Error listing payment methods:", error.response?.data || error.message);
        throw error;
    }

    return response.data.data;
}

/**
 * Finds payment method by name or type
 * @param {string} companyId - The company ID
 * @param {string} searchTerm - The payment method to find (e.g., 'Bonifico', 'Carta')
 * @returns {Promise<Object|null>} Payment method object or null if not found
 */
export async function findPaymentAccount(companyId, searchTerm) {
    const paymentMethods = await listPaymentAccounts(companyId);
    return (
        paymentMethods.find(
            (method) =>
                method.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                method.type?.toLowerCase().includes(searchTerm.toLowerCase())
        ) || null
    );
}
