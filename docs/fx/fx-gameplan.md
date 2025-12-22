Proposal for FX Strategy in CrewSplit (Local‑First Architecture)
Current architecture and pain points

CrewSplit is designed to be local‑first and fully functional offline. The documentation and AGENTS guidelines emphasise that the app should be deterministic, with all computations auditable, and that online sync is optional
github.com
github.com
. In the current codebase:

A DisplayCurrencyAdapter wraps settlement results and converts amounts from the trip currency to the user’s display currency. It relies on an FxRateProvider interface. The default implementation is a StubFxRateProvider that returns 1.0 when currencies are equal and throws an error otherwise
github.com
. It supports manually setting a rate via setRate(), but does not fetch rates automatically.

When the display currency differs from the trip currency, the adapter multiplies amounts by the FX rate and rounds to the nearest cent
github.com
. If no rate is provided, the app logs a warning like “No exchange rate available for EUR→USD. Please set a manual rate using setRate() or implement a live FX provider.” The provided log messages show these warnings and indicate that the settlement could not be shown in USD.

Because of the offline‑first design and absence of a live provider, converting currencies requires manual entry of rates. This is inconvenient for casual users (e.g., family members), and the error messages degrade the UX.

Requirements for a future FX solution

From the user’s description and the project goals, the FX solution should:

Respect the local‑first/offline design – everything should work even without network access. The app should not depend on an always‑on server.

Maintain determinism – the same input data should always produce the same settlement. Exchange rates must be stored and versioned so that settlements can be reproduced later.

Minimise friction – avoid requiring every family member to obtain an API key. Ideally, no key at all.

Allow occasional updates – rates should be fetched periodically from a reliable source and cached locally. One device can fetch rates and share them via optional sync or Git repository.

Support manual fallback – allow users to set rates manually if offline or if their desired currency pair is not covered.

Options for obtaining FX data

The table below compares possible data sources. Caching refers to storing responses locally in SQLite so they can be used offline.

Option API key required? Update frequency (free tier) Key benefits Potential issues
Frankfurter (api.frankfurter.dev) No
frankfurter.dev
Updates daily around 16:00 CET
frankfurter.dev
– Completely free and open‑source. No usage caps or API keys
frankfurter.dev
. – Allows changing the base currency and filtering to specific target currencies
frankfurter.dev
. – Suitable for client‑side or mobile apps; you can self‑host if desired. – Rates are end‑of‑day reference rates (not intraday). – Only ~30 years of historical data; may not support all exotic currencies.
ExchangeRate‑API (Open access endpoint) No
exchangerate-api.com
(attribution required) Once per day
exchangerate-api.com
– Free to use without an API key; caching is explicitly allowed
exchangerate-api.com
. – Returns base currency rates to all supported currencies in one call
exchangerate-api.com
. – Rate limited; however, one request per day or even hourly is acceptable
exchangerate-api.com
. – Requires an attribution link
exchangerate-api.com
. – Data cannot be redistributed; only used within the app
exchangerate-api.com
.
ExchangeRate‑API (free tier with key) Yes Once per day
exchangerate-api.com
(1.5k requests per month) – More generous request limit; no attribution needed. – Requires an API key for each device or a centralised backend. – Free tier limits may still be reached if many users request individually.
European Central Bank (ECB) Data Portal) No Daily – Official reference rates. – Provides SDMX 2.1 API with time series
data.ecb.europa.eu
. – API is complex; requires constructing SDMX queries. – Only returns rates against EUR; converting via other base currencies requires additional calculations.
Manual entry (Current stub provider) No User-defined – Fully offline, deterministic; no dependencies. – Requires users to know and input rates. – Not user-friendly and error-prone.
Recommended architecture

Implement a CachedFxRateProvider

Extend the FxRateProvider interface to read exchange rates from a SQLite table (e.g., fx_rates). The provider would:

Look up a fromCurrency-toCurrency rate in the table; if present, return it immediately (offline operation).

When the device has internet access, fetch the latest rates from a selected external API (Frankfurter or ExchangeRate‑API) and persist them to the table. If the app is offline, skip the fetch.

Expose a lastUpdated timestamp so that the app can display when rates were last refreshed and decide when to refresh.

Provide a method to set manual rates for currencies not covered by the API or for offline emergency updates.

Because the FX data is stored in SQLite, all conversions remain deterministic and auditable, satisfying the project’s core principles
github.com
. Only the retrieval of new rates involves network I/O.

Choose a data source

Primary choice: Frankfurter – It requires no API key or usage limits
frankfurter.dev
and is free to use in client‑side apps. The API returns daily rates with the ability to change the base currency and filter specific symbols
frankfurter.dev
. For example, a GET request to https://api.frankfurter.dev/latest?base=EUR&symbols=USD,GBP,JPY returns USD, GBP and JPY rates. Because the API is open, each device could fetch the latest rates directly once per day. You may also self‑host the service, which would allow bundling the API with the app to guarantee availability.

Fallback: ExchangeRate‑API open access – Use this as a secondary provider. The endpoint https://open.er-api.com/v6/latest/USD returns rates from USD to all supported currencies
exchangerate-api.com
. It also allows caching and only updates once per day
exchangerate-api.com
. Rate limiting is lenient if you only fetch once a day
exchangerate-api.com
. Attribution can be placed discreetly in the app’s About page
exchangerate-api.com
. In case Frankfurter is unavailable or you need more currencies, you can fallback to this provider.

Centralised key management for key‑based APIs (optional)

If you decide to use a key‑based API (e.g., ExchangeRate‑API free or pro tiers), avoid requiring each user to set up their own key. Instead:

Use a CI job or a small serverless function that fetches daily FX rates with the key and commits them (e.g., JSON) to your GitHub repo or another sync store.

Devices then download the rates via your sync mechanism (Supabase or PocketBase as described in the AGENTS guidelines
github.com
). This ensures only one key is needed and reduces calls from client devices.

UI/UX considerations

Display a “last updated” date next to converted amounts so users know if rates might be stale.

When no rate is available and the user requests a conversion, show a friendly message suggesting to update rates or set a manual rate.

Provide a settings screen where a user can trigger a rate refresh and optionally input manual rates. This screen can also include the required attribution if using ExchangeRate‑API
exchangerate-api.com
.

Persist and version rates

To preserve determinism, store the FX rates along with the trip or settlement record. When a trip is exported/imported or synced, include the rates used for the settlement so that totals remain reproducible. Each settlement could store the fxRateSource, rate, and date used for conversion. If a user later updates rates and recomputes settlements, both versions can coexist.

Answering the user’s questions

“How do we move forward with FX given our offline‑first architecture?” Implement a cached FX provider backed by a local SQLite table. Use an open API like Frankfurter to fetch rates occasionally, store them, and perform conversions offline. Provide manual rate entry as a fallback.

“I doubt historical trends will help.” Agreed. For splitting expenses, you only need a single current rate when closing a trip. Historical data is useful for auditing but not required for real‑time conversion.

“If I use API keys, that’s a hurdle for family members … unless I pull with the keys once in awhile from one device/source (GitHub) and push to everything else?” You can avoid API keys entirely by using Frankfurter or the open ExchangeRate‑API, both of which require no key. If you choose a key‑based service (for more frequent updates or support), fetch rates on a single device or CI job and distribute the rates through your existing sync mechanism. This way only one key is needed and users don’t have to manage keys.

Conclusion

By integrating a CachedFxRateProvider and using a keyless API such as Frankfurter, CrewSplit can remain offline‑first and deterministic while offering a frictionless currency‑conversion experience. Optional manual entry and a simple sync mechanism will ensure the app continues to work in remote locations or long after the FX provider is unavailable. If you later need more frequent updates or guaranteed uptime, you can centralise rate fetching with a single API key and share the cached rates across devices.
