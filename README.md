<p align="center"><img width="700" alt="README header" src="https://github.com/user-attachments/assets/33f258aa-5751-46c2-844f-f04dc83b62b9" /></p>

<p align="center">
  <a href="#invoice-parser-for-fatture-in-cloud-"><strong>Invoice Parser for Fatture In Cloud 🇬🇧</strong></a> ·
  <a href="#importa-automaticamente-le-spese-in-fatture-in-cloud-"><strong>Importa Automaticamente le spese in Fatture In Cloud 🇮🇹</strong></a> ·
</p>

## Invoice Parser for Fatture In Cloud 🇬🇧

A CLI tool that automates the tedious process of manually uploading business expenses to Fatture In Cloud. It uses Claude.ai to extract relevant information from PDF invoices and automatically uploads them as business expenses.

⚠️ This isn't a complete or general-purpose software. It covers my specific freelancer use case, but it works well enough to be a useful starting point for others.

### Prerequisites

-   Node.js >= 22

### How to Run

1. `npm install`
2. Add your invoices to the directory `docs-to-import`
3. Create an `.env` file based on `.env.example` and add your ANTHROPIC and Fatture in Cloud tokens

    - [Get Fatture in Cloud Token](https://developers.fattureincloud.it/docs/authentication/manual-authentication)
    - [Get anthropic api key](https://console.anthropic.com/settings/keys)

4. Run `node --env-file=.env index.js`. It will ask if you want to:
    - Proceed with parsing & upload
    - Or only parse and print (for debugging and testing)

## Importa Automaticamente le spese in Fatture In Cloud 🇮🇹

Uno strumento CLI che automatizza il palloso processo di caricamento manuale delle spese aziendali su Fatture In Cloud. Usa Claude.ai per estrarre le informazioni rilevanti dalle fatture PDF e le carica automaticamente come spese.

⚠️ Non è assolutamente un software completo. Copre a malapena il mio specifico caso d'uso da freelancer, ma funziona abbastanza bene da essere un buon punto di partenza per altri.

### Prerequisiti

-   Node.js >= 22

### Come usare questa repo

1. `npm install`
2. Aggiungi le tue fatture nella directory `docs-to-import`
3. Crea un file `.env` basato su `.env.example` e aggiungi i tuoi token ANTHROPIC e Fatture in Cloud
    - [Genera Token per Fatture in Cloud](https://developers.fattureincloud.it/docs/authentication/manual-authentication)
    - [Genera chiave API anthropic](https://console.anthropic.com/settings/keys)
4. Esegui `node --env-file=.env index.js`. Ti chiederà se vuoi:
    - Procedere con parsing e caricamento
    - O solo parsing e stampa (per debug e test)

## License / Licenza

Do whatever you want with this code.
Fai quello che vuoi con questo codice.
