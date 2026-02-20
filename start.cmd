@echo off
npm run build && node bin\synthtabs.js start %*
