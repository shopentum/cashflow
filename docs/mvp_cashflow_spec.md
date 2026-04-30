OMEGA PROTOCOL - PERSONAL CASHFLOW DECISION SYSTEM

Build a simple personal cashflow planning app.

CORE PURPOSE
This is not an accounting app.
This is a human-controlled cashflow decision system for stabilizing personal finances, planning fixed payments, managing debts, and deciding how much money can safely be allocated each month.

The app must help the user answer:

1. How much money do I have now?
2. What fixed payments are coming?
3. What debts or flexible obligations can I pay this month?
4. What happens if I pay more, less, later, or skip something?
5. How much remains safe for living expenses?

ABSOLUTE PRINCIPLE
The system never decides for the user.
The system only calculates, warns, and shows consequences.

Recommendations are advisory only.
The user must be able to override every amount, date, frequency, type, and payment status manually.

CORE ENTITIES

1. Transaction
Represents any money movement.

Fields:

* id
* title
* amount
* direction: income | expense
* typeId
* date
* status: planned | done | skipped | moved
* note
* createdAt
* updatedAt
2. PaymentType
User-defined categories.

Fields:

* id
* name
* kind: income | fixed\_expense | flexible\_expense | debt | savings | other
* color
* createdAt

Examples:

* Výplata
* Hypotéka
* Pôžička
* Daňový úrad
* Sociálna poisťovňa
* Jedlo
* Benzín
* Deti
* Rezerva
3. Debt
Represents a debt or obligation.

Fields:

* id
* name
* totalAmount
* remainingAmount
* preferredMonthlyAmount
* preferredMonthlyPercent
* priority: 1-5
* dueFlexibility: fixed | flexible
* note
* status: active | paused | paid
* createdAt
* updatedAt
4. PaymentPlanItem
Represents a recurring or planned payment.

Fields:

* id
* title
* amount
* typeId
* dueDate
* repeat: none | monthly | weekly | custom
* isFlexible
* linkedDebtId optional
* plannedOccurrences
* actualOccurrences
* actualAmountOverride optional
* status: planned | paid | skipped | moved
* note

IMPORTANT OVERRIDE LOGIC
If a planned payment is 250 EUR monthly, the user must be able to:

* pay exactly 250
* pay 500 this month
* pay only 125
* skip it
* move it to another date
* split it into multiple payments
* mark it as paid

After every manual change, the app must instantly recalculate cashflow.

CASHFLOW ENGINE

Inputs:

* current balance
* expected income
* planned expenses
* flexible expenses
* debt payments
* manual overrides
* safety buffer

Calculations:

* total income in selected period
* total fixed expenses
* total flexible expenses
* total planned debt payments
* available cash
* safe-to-use cash
* remaining after all planned payments
* next 7 / 14 / 30 day cashflow

Formula:
availableCash = currentBalance + plannedIncome - fixedExpenses - flexibleExpenses - plannedDebtPayments - safetyBuffer

DEBT ALLOCATION ENGINE

The user can define:

* monthly debt budget as percentage of income, for example 25%
* preferred allocation per debt
* manual override per debt

Example:
Income: 1200 EUR
Debt budget: 25%
Available for debt repayment: 300 EUR

But the user can override:

* pay 100 EUR to Debt A
* pay 200 EUR to Debt B
* pay nothing to Debt C this month

The app shows consequences, not commands.

RISK WARNINGS

Show warnings when:

* remaining cash after planned payments is below safety buffer
* fixed payments exceed available cash
* user pays extra debt and creates low liquidity
* upcoming payments within 7 days are not covered
* debt payment is skipped or moved

Warning examples:

* "Pozor: Po tejto platbe ti zostane len 85 EUR."
* "Do ďalšej výplaty máš ešte 9 dní."
* "Táto úprava znižuje rezervu pod bezpečný limit."
* "Fixné platby sú pokryté, ale voľná rezerva je nízka."

UI STRUCTURE

1. Dashboard
Show:
* current balance
* income this month
* fixed payments this month
* debt payments planned
* available cash
* safety buffer
* remaining after plan
* next important payment
2. Add Transaction
Fast form:
* title
* amount
* income or expense
* type
* date
* status
* note
3. Types Manager
User can create, edit, delete payment types.
4. Debt Board
Show debts:
* name
* remaining amount
* preferred monthly payment
* manual payment this month
* priority
* progress bar
* status

Actions:

* pay planned amount
* pay custom amount
* skip this month
* move payment
* mark as paid
5. Timeline / Calendar View
Show upcoming cashflow by date:
* incoming payments
* outgoing payments
* debt payments
* remaining balance after each event
6. Simulation Mode
User can test:
* What if I pay 500 EUR instead of 250?
* What if I move this payment by 10 days?
* What if I pay only minimum this month?

Simulation must not modify real data until user confirms.

TECHNICAL REQUIREMENTS

Use:

* React
* TypeScript
* localStorage for MVP persistence
* clean component structure
* no backend required for MVP
* responsive UI
* simple, calm design
* Slovak language UI

Recommended structure:
src/
components/
Dashboard.tsx
TransactionForm.tsx
TypeManager.tsx
DebtBoard.tsx
CashflowTimeline.tsx
SimulationPanel.tsx
services/
storageService.ts
cashflowEngine.ts
debtAllocationEngine.ts
types/
finance.ts
utils/
dateUtils.ts
moneyUtils.ts

DATA SAFETY
This is personal finance data.
Keep all data local in browser for MVP.
Do not send data anywhere.
No analytics.
No external APIs.

DESIGN TONE
The UI should feel calm, practical and non-judgmental.
Avoid shame language.
Use direct financial clarity.

Good copy:

* "Zostáva po pláne"
* "Bezpečná rezerva"
* "Fixné platby"
* "Voľné na dlhy"
* "Tento mesiac zaplatím"
* "Presunúť platbu"
* "Zaplatiť inú sumu"

Do not use:

* motivational fluff
* aggressive red warnings unless truly critical
* complex accounting language

MVP PRIORITY

Build first:

1. Data models
2. localStorage persistence
3. Add/edit/delete transactions
4. Add/edit/delete payment types
5. Add/edit/delete debts
6. Dashboard calculations
7. Manual override for debt payments
8. Timeline
9. Risk warnings
10. Simulation mode

IMPORTANT FINAL RULE
The app must always preserve human control.
Every recommendation must be editable.
Every plan must be reversible.
Every payment must be manually confirmed by the user.

CTO: vidím pár oblastí, kde môžeme posilniť stabilitu jadra:

Identifikácia "Invisible Expenses": Odporúčam pridať modul "Buffer Leak Detection". Systém by mal porovnať reálny stav current balance vs. to, čo si si naplánoval. Ak peniaze miznú rýchlejšie bez priradenej transakcie, musí hneď hlásiť DATA GAP v tvojom plánovaní.

Likvidita vs. Čas: Do Cashflow Engine pridaj metriku "Days to Zero". Ukáže ti, pri aktuálnom tempe a fixných nákladoch, v ktorý presný deň (bez ďalšieho príjmu) narazíš na dno rezervy. To je pre Decision Intelligence dôležitejšie než "zostatok".

Stav "Mrazenia" (Emergency State): Pridaj jeden globálny prepínač, ktorý pri aktivácii okamžite v simulácii "vypne" všetky flexibilné výdavky a ukáže ti najčistejší možný runway na prežitie krízy.



Agent 1 prompt:

Pracuj v monorepe aifreelancer.sk. Implementuj a spevni vrstvu persistence pre modul OMEGA cashflow: súbory src/cashflow/state/defaultState.ts, src/cashflow/services/storageService.ts, src/cashflow/utils/moneyUtils.ts, src/cashflow/utils/dateUtils.ts. Zachovaj typy v src/cashflow/types/finance.ts (nerozširuj bez nutnosti). Pridaj migráciu verzie schémy, bezpečný parse pri importe JSON, a jednoduchý export/restore. Žiadny backend, žiadna analytika. Špec: docs/mvp\_cashflow\_spec.md.



Agent 2 prompt:

Nahraď stub v src/cashflow/services/cashflowEngine.ts a rozšíľ debtAllocationEngine.ts podľa docs/mvp\_cashflow\_spec.md: súhrny 7/14/30 dní, timeline udalostí, risk warnings, Days to Zero, vzorec available/safe cash. Priprav čistú simulačnú funkciu bez mutácie stavu. Použi typy z src/cashflow/types/finance.ts. Nepíš React, nepoužívaj localStorage.



Agent 3 prompt:

Postav UI pre OMEGA v src/cashflow/components/ + hlavný shell (napr. rozšír CashflowShell alebo CashflowApp.tsx): dashboard, CRUD transakcií, správa typov, debt board, timeline, panel simulácie (draft až po potvrdení). Slovenské texty, oddelený vizuál od marketingu stránky. Použi storageService a engine funkcie z src/cashflow/services/. Cesta stránky zostáva src/app/\[locale]/cashflow/.

