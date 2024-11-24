build:
	pnpm --filter !"./sandbox/*" run -r build

dt:
	pnpm --filter "./packages/lib" run build
	pnpm --filter "./packages/devtools-*" run -r build
	pnpm --filter "./packages/vite-plugin-kaioken" run build

test:
	NODE_ENV=development pnpm --filter !"./sandbox/*" run -r --parallel test

test_lib:
	NODE_ENV=development pnpm --filter "./packages/lib" run -r --parallel test
