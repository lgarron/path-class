.PHONY: build
build: build-js build-types

.PHONY: build-js
build-js: setup
	bun run ./script/build-js.ts

.PHONY: build-types
build-types: setup
	bun x tsc --project ./tsconfig.types.json

.PHONY: setup
setup:
	bun install --frozen-lockfile

.PHONY: test
test:
	bun test

.PHONY: lint
lint: setup
	bun x @biomejs/biome check

.PHONY: format
format: setup
	bun x @biomejs/biome check --write

.PHONY: publish
publish:
	npm publish

.PHONY: clean
clean:
	rm -rf ./dist

.PHONY: reset
reset: clean
	rm -rf ./node_modules
