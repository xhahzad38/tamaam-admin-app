#!/usr/bin/env node
// Keeps the code shared by tamaam-admin-app and tamaam-seller-app identical.
//
//   npm run shared:check                 compare with the sibling app, exit 1 on drift
//   npm run shared:sync                  copy the mirrored folders FROM the sibling app into this one
//   node scripts/shared.mjs check <dir>  compare with an explicit checkout
//
// App-specific code lives outside these paths: src/app.shell.ts (roles, menu, copy),
// src/app.routes.ts, src/app.config.ts and src/app/features/* (except system + login).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MIRRORED = [
    'src/app/core',
    'src/app/shared',
    'src/app/layout',
    'src/app/features/system',
    'src/app/features/auth/pages/login',
    'src/app/features/account',
    'src/assets',
    'public/favicon.svg',
    'scripts/shared.mjs',
    'docs/ARCHITECTURE.md'
];

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [command = 'check', explicitPeer] = process.argv.slice(2);
const peer = path.resolve(explicitPeer ?? path.join(here, '..', path.basename(here).includes('admin') ? 'tamaam-seller-app' : 'tamaam-admin-app'));

if (!fs.existsSync(peer)) {
    console.error(`Peer app not found at ${peer}. Pass its path: node scripts/shared.mjs ${command} <dir>`);
    process.exit(2);
}

function list(root, rel) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) return [];
    if (fs.statSync(full).isFile()) return [rel];
    return fs.readdirSync(full).flatMap((name) => list(root, path.posix.join(rel, name)));
}

const read = (root, rel) => fs.readFileSync(path.join(root, rel));
// Compare text with normalised line endings so CRLF/LF checkouts don't count as drift.
const same = (a, b) => a.equals(b) || a.toString('utf8').replace(/\r\n/g, '\n') === b.toString('utf8').replace(/\r\n/g, '\n');

const files = new Set(MIRRORED.flatMap((rel) => [...list(here, rel), ...list(peer, rel)]));
const drift = [];
for (const rel of [...files].sort()) {
    const mine = fs.existsSync(path.join(here, rel)) ? read(here, rel) : null;
    const theirs = fs.existsSync(path.join(peer, rel)) ? read(peer, rel) : null;
    if (!mine || !theirs || !same(mine, theirs)) drift.push({ rel, mine, theirs });
}

if (command === 'check') {
    if (drift.length === 0) {
        console.log(`Shared code matches ${path.basename(peer)} (${files.size} files).`);
        process.exit(0);
    }
    for (const { rel, mine, theirs } of drift) console.log(`${!mine ? 'only in peer ' : !theirs ? 'only here    ' : 'differs      '} ${rel}`);
    console.log(`\n${drift.length} file(s) differ. Make the change in one app, then run "npm run shared:sync" in the other.`);
    process.exit(1);
}

if (command === 'sync') {
    for (const { rel, theirs } of drift) {
        const target = path.join(here, rel);
        if (theirs) {
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, theirs);
            console.log(`updated  ${rel}`);
        } else {
            fs.rmSync(target);
            console.log(`removed  ${rel}`);
        }
    }
    console.log(drift.length ? `\nSynced ${drift.length} file(s) from ${path.basename(peer)}.` : 'Already in sync.');
    process.exit(0);
}

console.error(`Unknown command "${command}". Use check or sync.`);
process.exit(2);
