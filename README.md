<p align="center"><img width="700" alt="README header" src="https://github.com/user-attachments/assets/33f258aa-5751-46c2-844f-f04dc83b62b9" /></p>

<p align="center">
  <a href="#invoice-parser-for-fatture-in-cloud-"><strong>Invoice Parser for Fatture In Cloud 🇬🇧</strong></a> ·
  <a href="#importa-automaticamente-le-spese-in-fatture-in-cloud-"><strong>Importa Automaticamente le spese in Fatture In Cloud 🇮🇹</strong></a> ·
</p>
<br/>

## Invoice Parser for Fatture In Cloud 🇬🇧

A CLI tool that automates the tedious process of manually uploading business expenses to Fatture In Cloud. It can use Anthropic Claude or Google Gemini to extract relevant information from PDF invoices and automatically uploads them as business expenses.

⚠️ This isn't a complete or general-purpose software. It covers my specific freelancer use case, but it works well enough to be a useful starting point for others.

### Prerequisites

-   Node.js >= 22

### How to Run

1. `npm install`
2. Add your invoices to the directory `docs-to-import`
3. Create an `.env` file based on `.env.example` and add your Fatture in Cloud token and LLM keys

    - [Get Fatture in Cloud Token](https://developers.fattureincloud.it/docs/authentication/manual-authentication)
    - [Get anthropic api key](https://console.anthropic.com/settings/keys)
    - [Get Gemini API key](https://ai.google.dev/gemini-api/docs/api-key)
    - Use `LLM_PROVIDER=anthropic` (default) or `LLM_PROVIDER=gemini`

4. Run `node --env-file=.env index.js`. It will ask if you want to:
    - Proceed with parsing & upload
    - Only parse and print (for debugging and testing)
    - Rollback one or more previously created expenses
5. On each successful upload run, the tool stores rollback metadata in `rollback-history.json` (or `ROLLBACK_HISTORY_FILE` from `.env`) so you can delete the expense from Fatture in Cloud and restore the file from `docs-to-import/done` back to its original folder.

## Importa Automaticamente le spese in Fatture In Cloud 🇮🇹

Uno strumento CLI che automatizza il palloso processo di caricamento manuale delle spese aziendali su Fatture In Cloud. Puoi usare Anthropic Claude o Google Gemini per estrarre le informazioni rilevanti dalle fatture PDF e caricarle automaticamente come spese.

⚠️ Non è assolutamente un software completo. Copre a malapena il mio specifico caso d'uso da freelancer, ma funziona abbastanza bene da essere un buon punto di partenza per altri.

### Prerequisiti

-   Node.js >= 22

### Come usare questa repo

1. `npm install`
2. Aggiungi le tue fatture nella directory `docs-to-import`
3. Crea un file `.env` basato su `.env.example` e aggiungi il token Fatture in Cloud e le chiavi LLM
    - [Genera Token per Fatture in Cloud](https://developers.fattureincloud.it/docs/authentication/manual-authentication)
    - [Genera chiave API anthropic](https://console.anthropic.com/settings/keys)
    - [Genera chiave API Gemini](https://ai.google.dev/gemini-api/docs/api-key)
    - Usa `LLM_PROVIDER=anthropic` (default) oppure `LLM_PROVIDER=gemini`
4. Esegui `node --env-file=.env index.js`. Ti chiederà se vuoi:
    - Procedere con parsing e caricamento
    - Solo parsing e stampa (per debug e test)
    - Fare rollback di una o più spese create in precedenza
5. Dopo ogni creazione andata a buon fine, lo script salva i dati di rollback in `rollback-history.json` (oppure nel file indicato da `ROLLBACK_HISTORY_FILE` nel `.env`) per poter eliminare la spesa da Fatture in Cloud e ripristinare il file da `docs-to-import/done` al percorso originale.

## License / Licenza

Do whatever you want with this code.
Fai quello che vuoi con questo codice.
