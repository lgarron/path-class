.PHONY: build
build: build-js build-types

.PHONY: build-js
build-js: setup
	bun run ./script/build-js.ts

.PHONY: build-types
build-types: setup
	bun x -- bun-dx --package typescript tsc -- --project ./tsconfig.build-types.json

.PHONY: setup
setup:
	bun install --frozen-lockfile

.PHONY: check
check: lint test build check-package.json

.PHONY: test
test:
	bun test

.PHONY: lint
lint: setup
	bun x -- bun-dx --package @biomejs/biome biome -- check
	bun x -- bun-dx --package readme-cli-help readme-cli-help -- check
	# There should be no `async`/`await` in the sync code.
	grep -r "async\|await" ./src/sync/ || true
	bun run ./script/lint-sync-code.ts
	bun x -- bun-dx --package typescript tsc -- --project .
	bun x -- bun-dx --package typescript tsc -- --project ./examples/

.PHONY: format
format: setup
	bun x -- bun-dx --package @biomejs/biome biome -- check --write
	bun x -- bun-dx --package readme-cli-help readme-cli-help -- update

.PHONY: check-package.json
check-package.json: build
	bun x -- bun-dx --package @cubing/dev-config package.json -- check

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
prepublishOnly: clean check build
