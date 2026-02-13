#!/usr/bin/env bash
npm run build && node bin/synthos.js start "$@"
