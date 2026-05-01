# Nasadenie omega-cashflow: samostatný repozitár + subdoména (Vercel + Websupport DNS)

Tento návod predpokladá doménu **aifreelancer.sk** u Websupport a hlavný projekt na **GitHub + Vercel**. Cashflow beží ako **druhý repozitár** a **druhý Vercel projekt**, dostupný na napr. **cashflow.aifreelancer.sk**.

## 1. Repozitár na GitHube

1. Vytvor nový repozitár (napr. `omega-cashflow` alebo `aifreelancer-cashflow`).
2. Lokálne v koreňovom priečinku projektu (ak ešte nie je git):

   ```bash
   git init
   git branch -M main
   git remote add origin https://github.com/TVOJ-UCET/NAZOV-REPA.git
   git add .
   git commit -m "chore: initial omega-cashflow app"
   git push -u origin main
   ```

3. Over, že v repozitári sú aspoň: `package.json`, `vite.config.ts`, `src/`, `vercel.json`.

### Ak vo Verceli „nie je žiadny deploy“ / projekt vôbec nepribudol

Úplný začiatok musíš urobiť **ručne na vercel.com** — push na GitHub sám deploy nespustí, kým neexistuje napojenie.

1. **GitHub aplikácia Vercelu:** účet (alebo organizácia `shopentum`) na GitHu musí mať [Vercel GitHub Integration](https://vercel.com/docs/deployments/git/vercel-for-github); pri **Import** potvrď oprávnenia na výber repozitára `cashflow`.
2. **Add New → Project → Import** `shopentum/cashflow`, vetva **`main`**, Root Directory prázdny (monorepo off).
3. Build musí zostať ako v `vercel.json`: Framework **Vite**, `npm run build`, Output **`dist`**.
4. Po prvom úspechu uvidíš v záložke **Deployments** aspoň jeden záznam; pri chybe otvor log buildu (**Building** → červený riadok).

### Doména vs. priečinok (`Root Directory`)

Na Verceli sú to **dve oddelené veci**:

| Čo nastavuješ | Čo to robí |
|---------------|------------|
| **Root Directory** (pri importe rozbaľ „Build and Output Settings“, alebo neskôr **Project → Settings → General → Root Directory**) | Z ktorého **podpriečinka v repozitári** Vercel spustí `npm install` / `npm run build` — musí tam byť **`package.json`** tejto appky (Vite). |
| **Domains** (**Settings → Domains**) | Ktorá **verejná URL** (napr. `cashflow.aifreelancer.sk` alebo `*.vercel.app`) ide na výstup buildu. **Nenahrádza výber priečinka.** |

Pri **samostatnom** repe `shopentum/cashflow` (cashflow ako jediná app v koreni) má byť Root Directory **`./`** alebo pole **nechať prázdne** — žiadny podpriečinok.

Ak máš na GitHu **jeden veľký mono‑repo pre aifreelancer.sk** (viac priečinkov s vlastnými `package.json`):

1. Vytvor **samostatný Vercel projekt** len pre cashflow (môže byť ten istý Git repo ako hlavný web).
2. V **Root Directory** zadaj cestu k priečinku tej appky, napr. `apps/cashflow` alebo `omega-cashflow` — presne kde leží `package.json` tohto projektu.
3. Doménu pridáš až potom (**Settings → Domains**): napr. `cashflow.aifreelancer.sk` na tomto projekte; hlavná stránka môže zostať na druhom projekte s iným Root a na `www` / apex.

Pri importe často prvá obrazovka zdôrazní **doménu náhľadu** — **`Root Directory` je inde**: pred Deploy rozbaľ **Configure Project / Build and Output Settings**, tam sa zadáva priečinok.

## 2. Nový projekt na Verceli

1. Prihlás sa na [vercel.com](https://vercel.com), **Add New → Project**.
2. **Import** repozitára z GitHubu (vyber ten s cashflow).
3. Nastavenia buildu (Vercel často uhádne sám vďaka `vercel.json` a Vite):
   - **Framework Preset:** Vite (alebo „Other“ s build command nižšie).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. **Deploy**. Po dokončení máš URL typu `nazov-projektu.vercel.app`.

## 3. Subdoména v projekte na Verceli

1. V projekte otvor **Settings → Domains**.
2. Klikni **Add** a zadaj napr. `cashflow.aifreelancer.sk` (alebo iný prefix, ktorý chceš).
3. Vercel zobrazí **čo presne máš pridať do DNS** (CNAME alebo A – ber vždy **aktuálne hodnoty z Vercelu**, nie staré návody z internetu).

Typicky pre subdoménu:

- Typ: **CNAME**
- **Host** (u Websupport niekedy „Názov“ / „Prefix“): `cashflow`
- **Cieľ / hodnota:** presne čo ukáže Vercel (často varianta s `vercel-dns`)

Ulož záznam u Websupport a počkaj na propagáciu (minúty až hodiny). Vercel sám vystaví **HTTPS**.

### Konflikty DNS

- Pre host `cashflow` nesmú byť **dva rôzne záznamy** (napr. CNAME aj A naraz).
- Ak tam už niečo máš z iného experimentu, vymaž starý záznam alebo ho uprav podľa Vercelu.

## 4. Kontrola po nasadení

- Otvor `https://cashflow.aifreelancer.sk` (alebo tvoju subdoménu).
- Ak stránka nenačíta JS/CSS: skontroluj v DevTools → Network; over, že build na Verceli prebehol úspešne a že doména v panely Vercelu je **Valid** (zelená).

## 5. Ďalšie deploye

Každý **push do `main`** (alebo vetvy, ktorú máš v projekte nastavenú ako Production) spustí nový deploy. Preview URL dostaneš pri **pull requestoch**, ak to máš v tíme zapnuté.

## Poznámky

- **Websupport** = správa DNS pre `aifreelancer.sk`. Hosting statickej appky je **Vercel** (`dist/` z `npm run build`).
- MVP cashflow používa **localStorage** v prehliadači; údaje sa neodosielajú na server.
- Viacero Vercel projektov na jednej doméne je bežné: apex / `www` na hlavný projekt, subdoména na cashflow.
