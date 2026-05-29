# TurboFlow Soccer Admin Panel

足球 RFQ 管理后台半真实原型。读接口优先直连已有 API，接口不可用或后端缺口模块会降级到演示数据；写接口失败会阻断并显示错误，不会伪造成成功。

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4, aligned with the main TurboFlow frontend visual tokens
- React Router
- Native fetch API client with response envelope support

## API

Create `.env.local` from `.env.example` when needed:

```bash
VITE_API_BASE_URL=https://surfv2-sit-api.nfexinsider.com
VITE_ENABLE_ADMIN_WRITES=true
```

### Environment base URLs

Each environment exposes one or more interchangeable entry points. Use the first one by default; the rest are backups.

| Environment | Default base URL | Backup base URLs |
| --- | --- | --- |
| SIT | `https://surfv2-sit-api.nfexinsider.com` | - |
| UAT | `https://surfv2-uat-api.nfexinsider.com` | `https://betav2-api.surf.one`, `https://betav2-api2.surf.one` |
| PROD | `https://api.turboflow.xyz` | `https://api2.turboflow.xyz`, `https://api3.turboflow.xyz`, `https://api4.turboflow.xyz` |

The build currently targets SIT. To point at another environment, set `VITE_API_BASE_URL` to that environment's base URL and rebuild.

If `VITE_API_BASE_URL` is empty, local Vite dev proxies `/api` and `/health` to `VITE_API_PROXY_TARGET`.

`VITE_API_BASE_URL` must be the API origin only, not a full endpoint path. For example, the SIT endpoint `https://surfv2-sit-api.nfexinsider.com/api/v1/soccer/rfq/trade` maps to `VITE_API_BASE_URL=https://surfv2-sit-api.nfexinsider.com`.

Do not put production or SIT credentials in any `VITE_*` variable because browser builds expose them. Admin writes are disabled unless `VITE_ENABLE_ADMIN_WRITES=true`.

## GitHub Pages

Pushes to `main` trigger `.github/workflows/deploy.yml`, which runs lint, dependency audit, production build, a dist asset scan, and deploys `dist` to GitHub Pages.

The deployed URL will be:

```text
https://errancel.github.io/admin-panel/
```

In repository settings, set Pages source to `GitHub Actions` if GitHub does not enable it automatically.

The GitHub Pages deployment is configured as a private SIT demo and points to `https://surfv2-sit-api.nfexinsider.com`. A real production admin panel must be hosted behind VPN/SSO/IP allowlist and backed by server-side authentication, RBAC, and audit logging.

## Modules

- Dashboard (总览)
- Markets & settlement (盘口与结算) — market pause/resume plus manual settlement fallback for exceptional results (handicap payouts, futures, single-source review)
- External reference price (外部参考价)
- Distributor markup (分销商加价)
- Ops monitoring (运维监控)
- Rebate browsing (返佣浏览) — read-only, per-user rebate detail
- Operational stats (运营数据) — event → match → market drill-down
- KPI reports (经营报表)
- Permissions & audit (权限与审计) — role permission management + immutable audit log

Note: rebate per-user query, server-side RBAC/audit log, and per-entity stats aggregation APIs are not yet exposed by the book service; those views fall back to demo data and are labelled accordingly.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
```
