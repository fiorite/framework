#!/usr/bin/env bash

vite -c vite.config.ts build
cp package.json dist/package.json
cp LICENSE dist/LICENSE
cp README.md dist/README.md