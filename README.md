# Kaioken

Development monorepo for **Kaioken**.

Kaioken is a very lightweight rendering library that aims to provide a familier development experience for those with HTML and Javascript experience.

## Structure

- `.github`
  - Contains workflows used by GitHub Actions.
- `assets`
  - Contains Kiaoken brand assets.
- `e2e`
  - Contains end-to-end test suite.
- `packages`
  - Contains the individual packages managed in the monorepo.
  - [kaioken](https://github.com/CrimsonChi/kaioken/blob/main/packages/kaioken)
  - [vite-plugin-kaioken](https://github.com/CrimsonChi/kaioken/blob/main/packages/vite-plugin-kaioken)
- `sandbox`
  - Contains example applications and random tidbits.

## Tasks

- Use `make build` to recursively run the build script in each package
- Use `make test` to recursively run the test script in each package
