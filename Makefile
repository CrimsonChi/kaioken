build:
	pnpm run -r build

test:
	pnpm run -r --parallel test

publish:
	cd package && npm publish