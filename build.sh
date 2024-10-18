#!/usr/bin/env bash

vite -c vite.config.ts build
cp package.json dist/package.json
cp LICENSE dist/LICENSE
cp README.md dist/README.md
chmod +x dist/cli.js

dts-bundle-generator --no-check -o dist/index.d.ts src/index.ts
dts-bundle-generator --no-check -o dist/nodejs.d.ts src/nodejs/index.ts
dts-bundle-generator --no-check -o dist/firestore.d.ts src/firestore/index.ts
#dts-bundle-generator --no-check --external-imports=vite  -o dist/vite.d.ts src/vite/index.ts
