# MVX Ads Master — verifica reale della UI (17 ottobre 2026)

Checkout autorizzato: `C:\Users\Deglu\.hermes\paperclip`. PR GitHub #1, branch `feat/mvx-sovereign-marketing-30-evidence`. Nessuna modifica a file fuori dalla directory `.hermes`.

## Verifiche completate

- `npm run test:mvx-marketing-all`: **134/134 test PASS**, suddivisi in 76 marketing, 18 dashboard, 29 trasversali, 11 Tier 1. Log locale non versionato: `evidence/mvx-marketing-fleet/suite-20261017.log`.
- Confermata la presenza del commit locale `566377d`: rimozione azienda fittizia, dati demo CRM/Planner, contatori fittizi; nuovi contratti read-only Tier 1; correzioni TypeScript/Sentry/OpenAPI/Vitest.
- Avviato Vite 8.2.2 su `http://127.0.0.1:5173` usando il checkout reale.
- Avviato Chrome con Playwright 1.62.1, profilo e directory temporanea **dentro `.hermes`**. Script riproducibile `scripts/mvx-marketing-fleet/ui-browser-smoke.mjs`.
- Navigazioni realmente tentate: home, Marketing Intelligence, Content Planner, CRM, Council, Skill Tree. **6/6 FAIL_BROWSER per timeout `page.goto(..., waitUntil:'domcontentloaded', timeout:30000)`; nessuna pagina validata, nessun esito inventato.** Report `evidence/mvx-marketing-fleet/ui-browser-20261017/report.json`.
- Rilevate richieste legacy dirette a `localhost:8770`: **0** durante queste navigazioni, ma le pagine non hanno completato il caricamento quindi il risultato non certifica tutta la UI.

## Blocco ambiente / workspace

Lo sparse checkout originale mancava di parti del frontend e di pacchetti interni. Estese **nel medesimo checkout** le directory `ui/src`, `packages/shared`, `packages/db`, `packages/plugins`, `packages/adapters`, `packages/adapter-utils`, senza nuovi repository paralleli.

- `tsc -p ui/tsconfig.json --noEmit` iniziale: **2231 errori**, in gran parte `TS2307` di moduli `@paperclipai/shared` o file `@/i18n` non risolti. Log locale `evidence/mvx-marketing-fleet/ui-typecheck-20261017.log`.
- Vite segnala pacchetti workspace non risolti (shared e adapter locali). Esiste `@playwright/test` ma non un import diretto `playwright`: lo script QA usa la dipendenza disponibile.
- Il preflight ufficiale `ensure-workspace-package-links.ts` non parte senza la risoluzione iniziale di `@paperclipai/shared` richiesta da `server/src/home-paths.ts`. Questo problema riguarda il bootstrap del workspace; non può essere classificato come UI green.

## Attività residue bloccanti

1. Ripristinare in modo controllato link e dipendenze PNPM per il monorepo, senza reinstallazioni distruttive su directory condivise; rieseguire Vite, `typecheck`, build e smoke.
2. Far completare realmente l'avvio della UI e la navigazione. Solo allora eseguire Playwright multi-browser (Chromium/Firefox/WebKit), desktop e mobile, click, form, modali, tastiera, screenshots e WCAG.
3. Testare backend con una vera azienda UUID autorizzata, segreti server-only e reale risposta Tier 1; no mock di CRM, calendar, ads o conversions.
4. Rieseguire i job GitHub CI e correggere ogni failure; la vecchia esecuzione sul commit `a313134` aveva 9 job falliti su 30. Questo report non implica che il nuovo commit sia già validato dalla CI.
5. Provare agent runtime, review ricevute, dati di marketing con IVA/fee, pubblicazione solo dopo approvazione, osservabilità e rollback, prima della promozione in produzione.

**Verdetto:** `NOT_PRODUCTION_READY`. I test MVX isolati sono verdi, la verifica completa browser/typecheck è negativa. PR deve restare draft.
