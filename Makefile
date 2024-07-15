build:
	pnpm --filter !"./sandbox/*" run -r build

test:
	NODE_ENV=development pnpm --filter !"./sandbox/*" run -r --parallel test