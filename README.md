# Kaioken

Development monorepo for **Kaioken**.

Kaioken is a lightweight rendering library that aims to provide a familiar development experience for those with HTML and Javascript experience.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/CrimsonChi/kaioken)

## Structure

- `.github`
  - Contains workflows used by GitHub Actions.
- `assets`
  - Contains Kaioken brand assets.
- `e2e`
  - Contains end-to-end test suite.
- `packages`
  - Contains the individual packages managed in the monorepo.
  - [kaioken](https://github.com/CrimsonChi/kaioken/blob/main/packages/lib)
  - [vite-plugin-kaioken](https://github.com/CrimsonChi/kaioken/blob/main/packages/vite-plugin-kaioken)
  - [devtools-host](https://github.com/CrimsonChi/kaioken/blob/main/packages/devtools-host)
  - [devtools-client](https://github.com/CrimsonChi/kaioken/blob/main/packages/devtools-client)
- `sandbox`
  - Contains example applications and random tidbits.

## Tasks

- Use `make build` to recursively run the build script in each package
- Use `make dev` to recursively run the dev script in each package
- Use `make test` to recursively run the test script in each package
