build:
	pnpm --filter !"./sandbox/*" run -r build

test:
	pnpm --filter !"./sandbox/*" run -r --parallel test