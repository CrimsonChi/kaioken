build:
	pnpm --filter !"./sandbox/*" run -r build

dt:
	pnpm --filter "./packages/lib" run build
	pnpm --filter "./packages/devtools-*" run -r build
	pnpm --filter "./packages/vite-plugin-kaioken" run build
	pnpm --filter "./sandbox/csr" run dev

test:
	NODE_ENV=development pnpm --filter !"./sandbox/*" run -r --parallel test