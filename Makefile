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
	bun x tsc --project .
	bun x -- readme-cli-help --fence "ts cli-help" --check-only "bun run -- 'test/example-usage.cli-help.ts'"

.PHONY: format
format: setup
	bun x @biomejs/biome check --write
	bun x -- readme-cli-help --fence "ts cli-help" "bun run -- 'test/example-usage.cli-help.ts'"

.PHONY: publish
publish:
	npm publish

.PHONY: clean
clean:
	rm -rf ./dist

.PHONY: reset
reset: clean
	rm -rf ./node_modules

.PHONY: prepublishOnly
prepublishOnly: lint test clean build
