# Campaign OS

Campaign creation, naming and UTM tracking for Meta and Google, built for Senior Marketing Executives. It replaces the Excel workflow:

Brand → Platform → Template → Campaign details → Landing URL → auto name → auto UTM → validation → campaign package → save/export

## Run

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production
npm run lint && npm run typecheck
```

Data is stored in the browser (localStorage) and seeded with demo brands, rules, templates and campaigns. To restore it, go to **Settings → Reset demo data**.

## Architecture

```
src/lib/domain     types.ts (Brand, Campaign, CampaignTemplate, NamingRule, UTMRule, User, LandingPage, TrackingParams), field registry
src/lib/engine     pure business logic, no React
  url.ts           landing URL parsing, brand/product detection, encoding, URL assembly (never duplicates utm_*)
  naming.ts        naming-rule engine ({BRAND}_{PLATFORM}_…)
  utm.ts           brand-specific UTM rule resolution + validation
  templates.ts     template + rule resolution (template override → brand rule)
  validation.ts    checks with step/field anchors for deep links
  campaign.ts      computeCampaign(): the single pipeline every screen uses
src/lib/store      repository.ts (persistence boundary: swap LocalStorageRepository for an API) + store actions
src/lib/io         TabularFormat interface (CSV today; add XLSX by implementing it) + campaign mapping
src/components     shared UI, campaign wizard, brand rule editors
src/app/(app)      routes
```

There are no ad-platform API calls yet. Meta Marketing API and Google Ads API sync can be added behind `CampaignOSRepository`.
