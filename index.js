import { Anthropic } from "@anthropic-ai/sdk";
import { promises as fs } from "fs";
import path from "path";
import { parse, format } from "date-fns";
import {
    getTaxDeductibilityForExpense,
    getPaymentAccountForExpense,
    getPaymentDateForExpense,
    pickCompany,
} from "./rules.js";
import safe from "safe-await";
import * as p from "@clack/prompts";

import {
    listCompanies,
    createReceivedDocument,
    uploadAttachment,
    getOrCreateSupplier,
    findCurrency,
    findPaymentAccount,
} from "./fatture-in-cloud.js";

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const EXPENSE_DETAILS_URL = "https://secure.fattureincloud.it/expenses/view";

/**
 * Processes a PDF file using Claude AI to extract invoice data
 * @param {Buffer} pdfBuffer - The PDF file buffer to process
 * @returns {Promise<Object>} The extracted and processed invoice data
 * @throws {Error} If processing fails
 */
async function processPDFWithClaude(pdfBuffer) {
    const base64PDF = pdfBuffer.toString("base64");

    // Read the prompt from the file
    const [promptError, prompt] = await safe(fs.readFile("prompt.txt", "utf-8"));
    if (promptError) {
        console.error("Error reading prompt file:", promptError);
        throw promptError;
    }

    const [messageError, message] = await safe(
        anthropic.messages.create(
            {
                model: "claude-3-5-sonnet-20241022",
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
                                    data: base64PDF,
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
        console.error("Error processing PDF with Claude:", messageError);
        throw messageError;
    }

    const content = message.content[0].text;
    const startIndex = content.indexOf("{");
    const endIndex = content.lastIndexOf("}");

    if (startIndex === -1 || endIndex === -1) {
        throw new Error("Could not find JSON in Claude's response");
    }

    const jsonStr = content.substring(startIndex, endIndex + 1);

    let parsed;
    try {
        parsed = JSON.parse(jsonStr);
    } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        throw new Error("Failed to parse JSON from Claude's response");
    }

    // Parse and format the date
    if (parsed.date) {
        try {
            // Parse the date in DD.MM.YYYY format
            const parsedDate = parse(parsed.date, "dd.MM.yyyy", new Date());
            // Format it in ISO format for consistency
            parsed.date = format(parsedDate, "yyyy-MM-dd");
        } catch (dateError) {
            console.error("Error parsing date from the document.");
            throw dateError;
        }
    }

    // Ensure total_amount is a number
    if (parsed.total_amount) {
        parsed.total_amount =
            typeof parsed.total_amount === "string"
                ? parseFloat(parsed.total_amount.replace("€", "").trim())
                : parsed.total_amount;
    }

    // Process itemized expenses
    if (Array.isArray(parsed.itemized_expenses)) {
        parsed.itemized_expenses = parsed.itemized_expenses.map((item) => ({
            ...item,
            amount: typeof item.amount === "string" ? parseFloat(item.amount.replace("€", "").trim()) : item.amount,
            period_start: item.period
                ? parse(item.period.split(" - ")[0], "dd.MM.yyyy", new Date()).toISOString()
                : null,
            period_end: item.period ? parse(item.period.split(" - ")[1], "dd.MM.yyyy", new Date()).toISOString() : null,
        }));
    }

    return parsed;
}

function detectCountryFromAddress(address, vatNumber) {
    // First try from VAT number as it's more reliable
    if (vatNumber) {
        const vatPrefix = vatNumber.substring(0, 2).toUpperCase();
        const vatCountries = {
            DE: "Germania",
            IT: "Italia",
            FR: "Francia",
            GB: "Regno Unito",
            ES: "Spagna",
            NL: "Paesi Bassi",
            BE: "Belgio",
            PT: "Portogallo",
            AT: "Austria",
            CH: "Svizzera",
        };
        if (vatCountries[vatPrefix]) {
            return vatCountries[vatPrefix];
        }
    }

    // If no country from VAT, try from address
    if (address) {
        const addressUpper = address.toUpperCase();
        const countryIndicators = {
            GERMANY: "Germania",
            DEUTSCHLAND: "Germania",
            MÜNCHEN: "Germania",
            MUNCHEN: "Germania",
            FRANCE: "Francia",
            ITALIA: "Italia",
            ITALY: "Italia",
            SPAIN: "Spagna",
            ESPAÑA: "Spagna",
            UK: "Regno Unito",
            "UNITED KINGDOM": "Regno Unito",
            NETHERLANDS: "Paesi Bassi",
            NEDERLAND: "Paesi Bassi",
            BELGIUM: "Belgio",
            BELGIQUE: "Belgio",
            PORTUGAL: "Portogallo",
            AUSTRIA: "Austria",
            SWITZERLAND: "Svizzera",
            SCHWEIZ: "Svizzera",
        };

        for (const [indicator, country] of Object.entries(countryIndicators)) {
            if (addressUpper.includes(indicator)) {
                return country;
            }
        }
    }

    return null;
}

/**
 * Formats the data for creating a received document
 * @param {Object} params - Parameters for formatting the document data
 * @param {Object} params.extractedData - Data extracted from the PDF
 * @param {Object} params.supplier - Supplier information
 * @param {Object} params.paymentAccount - Payment account details
 * @param {Object} params.currency - Currency information
 * @returns {Object} Formatted document data
 */
function formatReceivedDocumentData({ extractedData, supplier, paymentAccount, currency }) {
    const amountGross = extractedData.total_amount;
    const amountVat = extractedData.vat_amount;

    const paidDate = getPaymentDateForExpense(extractedData);

    return {
        type: "expense",
        entity: {
            id: supplier.id,
        },
        date: extractedData.date,
        description: extractedData.description,
        amount_net: amountGross - amountVat,
        amount_vat: amountVat,
        amount_gross: amountGross,
        tax_deductibility: getTaxDeductibilityForExpense(extractedData),
        items_list:
            extractedData.itemized_expenses?.map((item) => ({
                description: item.description || "",
                amount: item.amount,
                period_start_date: item.period_start || null,
                period_end_date: item.period_end || null,
            })) || [],
        payments_list: [
            {
                amount: amountGross,
                due_date: extractedData.date,
                paid_date: paidDate,
                status: "paid",
                payment_terms: {
                    days: 0,
                    type: "standard",
                },
                payment_account: {
                    id: paymentAccount.id,
                },
            },
        ],
        currency,
        language: {
            code: "it",
            name: "Italiano",
        },
    };
}

// Main execution
async function main() {
    const DIR = process.env.DIR || "docs-to-import";
    const doneDirectory = path.join(DIR, "done");

    const recap = {};

    p.intro(" pdf-to-fatture-in-cloud");

    const executionType = await p.select({
        message: "Vuoi eseguire le operazioni o solo stampare i dati estratti?",
        options: [
            { value: "run", label: "Esegui" },
            { value: "dry", label: "Solo stampa (dry run)" },
        ],
    });

    if (p.isCancel(executionType)) {
        p.log.error("Operation cancelled.");
        process.exit(0);
    }

    const s = p.spinner();

    s.start("Checking file system structure...");

    // Ensure the 'done' directory exists
    const [mkdirError] = await safe(fs.mkdir(doneDirectory, { recursive: true }));
    if (mkdirError) {
        console.error("Error creating done directory:", mkdirError);
        throw mkdirError;
    }

    // Ensure it can read the files in the directory
    let [readError, files] = await safe(fs.readdir(DIR));

    if (readError) {
        console.error("Error reading directory:", readError);
        throw readError;
    }

    // ignore useless files and directories
    files = files
        // clean hidden files
        .filter((file) => !file.startsWith("."))
        // clean done directory
        .filter((file) => file !== "done");

    s.stop("File system structure checked");

    s.start("Checking files to process...");

    if (files.length === 0) {
        s.stop("Checked files to process");
        p.log.error("No expenses to process found in the directory");
        process.exit(0);
    }

    s.stop(`Files to process: ${files.length}`);

    s.start("Getting account info from fatture in cloud...");
    const [companiesError, companies] = await safe(listCompanies());

    if (companiesError) {
        console.error("Error fetching companies:", companiesError);
        throw companiesError;
    }

    const company = pickCompany(companies.data.companies);

    if (!company) {
        console.error("No company to use found");
        throw new Error("No company to use found");
    }

    const companyId = company.id;
    s.stop(`Company to register expenses: ${company.name} [id: ${companyId}]`);

    s.start(`Processing files - ${files.length} files`);

    for (const file of files) {
        p.log.step(`Processing ${file}...`);
        const isPDF = file.toLowerCase().endsWith(".pdf");
        if (!isPDF) {
            p.log.warn(`Skipping ${file} as it's not a PDF`);
            continue;
        }

        const filePath = path.join(DIR, file);

        const [readFileError, pdfBuffer] = await safe(fs.readFile(filePath));

        if (readFileError) {
            console.error(`Error reading file ${file}:`, readFileError);
            throw readFileError;
        }

        const [extractError, extractedData] = await safe(processPDFWithClaude(pdfBuffer));
        if (extractError) {
            p.log.error(`Error processing PDF ${file}:`, extractError);
            throw extractError;
        }

        if (!extractedData.vendor_name) {
            p.log.error(`Skipping ${file} as it has no vendor name`);
            throw new Error("Skipping file as it has no vendor name");
        }

        // Upload the attachment first

        let attachmentToken = null;
        if (executionType === "run") {
            const [uploadError, token] = await safe(uploadAttachment(companyId, pdfBuffer, file));
            if (uploadError) {
                p.log.error(`Error uploading attachment ${file}:`, uploadError);
                throw uploadError;
            }

            attachmentToken = token;
        }

        // handle the supplier
        let supplier = null;
        if (executionType === "run") {
            const country = detectCountryFromAddress(extractedData.vendor_address, extractedData.vat_number);

            p.log.step("Checking supplier...");
            const [supplierError, supplierResult] = await safe(
                getOrCreateSupplier(companyId, {
                    name: extractedData.vendor_name,
                    vat_number: extractedData.vat_number,
                    country: country,
                })
            );

            if (supplierError) {
                p.log.error("Error handling supplier:", supplierError);
                throw supplierError;
            }
            supplier = supplierResult.supplier;

            if (supplierResult.new) {
                p.log.step(`Supplier created: ${supplier.name}`);
            } else {
                p.log.step(`Supplier found: ${supplier.name} [id: ${supplier.id}]`);
            }

            if (!supplier) {
                p.log.error("No supplier found");
                throw new Error("No supplier found");
            }
        }

        // handle the expense
        p.log.step("Creating expense...");
        const currencyCode = extractedData.currency || "EUR";
        const [currencyError, currency] = await safe(findCurrency(currencyCode));
        if (currencyError) {
            p.log.error("Error finding currency:", currencyError);
            throw currencyError;
        }

        const paymentAccountQuery = getPaymentAccountForExpense(extractedData);
        const paymentAccount = await findPaymentAccount(companyId, paymentAccountQuery);

        const expenseData = {
            ...formatReceivedDocumentData({
                extractedData,
                supplier: executionType === "run" ? supplier : { id: "<placeholder>" },
                paymentAccount,
                currency,
            }),
            attachment_token: attachmentToken,
        };

        if (executionType === "dry") {
            p.log.info(`Expense data: ${JSON.stringify(expenseData, null, 4)}`);
            continue;
        }

        const [expenseError, expense] = await safe(createReceivedDocument(companyId, expenseData));
        if (expenseError) {
            p.log.error("Error creating expense:", expenseError);
            throw expenseError;
        }

        // Move the file to the 'done' directory after successful processing
        const donePath = path.join(doneDirectory, file);
        const [moveError] = await safe(fs.rename(filePath, donePath));
        if (moveError) {
            p.log.error(`Error moving file ${file} to done directory.`);
            throw moveError;
        }
        p.log.success(
            `File ${file} processed, expense created - ${expense.data.date} ${EXPENSE_DETAILS_URL}/${expense.data.id}`
        );
        recap[file] = {
            date: expense.data.date,
            id: expense.data.id,
            url: `${EXPENSE_DETAILS_URL}/${expense.data.id}`,
            description: expense.data.description,
        };
    }

    s.stop(`All ${files.length} files processed`);

    console.table(recap);
}

main().catch(console.error);
