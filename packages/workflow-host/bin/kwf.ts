#!/usr/bin/env bun
import { cliMain } from '../lib/cli';

cliMain(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error) => {
    console.error(String(error?.message ?? error));
    process.exit(1);
  },
);
