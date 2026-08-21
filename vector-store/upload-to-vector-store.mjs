/**
 * upload-to-vector-store.mjs
 *
 * TWO MODES, decided automatically:
 *
 * 1. FIRST RUN (no store with this name exists yet):
 *    Creates a new vector store and uploads every file in ./vector-store/.
 *
 * 2. LATER RUNS (a store with this name already exists):
 *    Does NOT create a duplicate store and does NOT re-upload files that
 *    are already attached. It compares filenames in ./vector-store/ against
 *    what's already in the store, and uploads ONLY the new/missing ones.
 *    Files that exist in the store but were removed locally are reported,
 *    not deleted (deletion is left as a manual, deliberate action).
 *
 * SECURITY: never hardcode the API key. Set it as an environment variable
 * before running:
 *
 *   $env:OPENAI_API_KEY_NEW="sk-..."
 *   node upload-to-vector-store.mjs
 *
 * Requires: npm install openai (already a dependency in this project)
 */

import OpenAI from "openai";
import fs from "fs";
import path from "path";

const apiKey = process.env.OPENAI_API_KEY_NEW;

if (!apiKey) {
  console.error(
    "Missing env var. Run as:\n" +
    '  $env:OPENAI_API_KEY_NEW="sk-..."\n' +
    "  node upload-to-vector-store.mjs"
  );
  process.exit(1);
}

const client = new OpenAI({ apiKey });
/**
 * Does the store's byte count for this file still match the local content?
 *
 * Size is the only comparison available — the API exposes no checksum for a stored file. The
 * complication is that the store's copies are NOT consistently encoded: measured against the
 * live store on 2026-08-21, files last edited 22 Jul sit there at their raw byte size, while
 * files edited 24 Jul sit there one byte larger per line, i.e. CRLF-converted. Same store, same
 * upload run, two encodings.
 *
 * So a single rule produces false positives either way: comparing raw sizes flagged 10 untouched
 * files, comparing CRLF-adjusted sizes flagged 13 different untouched ones. Accepting EITHER
 * value reduces it to the files whose content actually changed.
 *
 * Why this matters rather than being cosmetic: with a dozen-plus permanent false alarms, a real
 * pending upload goes unnoticed — froots Kundeninformationen WAG 2018.md sat unuploaded from
 * 4 Aug to 21 Aug, invisible in the noise.
 *
 * This is still a heuristic: a genuine edit that happens to land on either size reads as
 * unchanged. The durable fix is a manifest of filename → sha256 written by this script on each
 * successful upload, compared on the next run. That can only cover uploads made from here on,
 * so it does not help for the existing store state — hence this.
 */
function storeSizeMatches(filePath, storeBytes) {
  const buf = fs.readFileSync(filePath);
  let bareLf = 0;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0x0a && buf[i - 1] !== 0x0d) bareLf++;
  }
  return storeBytes === buf.length || storeBytes === buf.length + bareLf;
}

const SOURCE_DIR = ".";
const VECTOR_STORE_NAME = "Digital Onboarding Guide - Knowledge Base";

async function findExistingStoreByName(name) {
  let after;
  do {
    const page = await client.vectorStores.list({ limit: 100, after });
    const match = page.data.find((vs) => vs.name === name);
    if (match) return match;
    after = page.has_more ? page.data[page.data.length - 1].id : undefined;
  } while (after);
  return null;
}

async function listFileDetailsInStore(vectorStoreId) {
  // Returns a Map: filename -> { fileId, bytes }
  const details = new Map();
  let after;
  do {
    const page = await client.vectorStores.files.list(vectorStoreId, {
      limit: 100,
      after,
    });
    for (const vsFile of page.data) {
      const meta = await client.files.retrieve(vsFile.id);
      details.set(meta.filename, { fileId: vsFile.id, bytes: meta.bytes });
    }
    after = page.has_more ? page.data[page.data.length - 1].id : undefined;
  } while (after);
  return details;
}

async function main() {
  const allEntries = fs.readdirSync(SOURCE_DIR);
  const localFiles = allEntries.filter((f) => f.endsWith(".md") || f.endsWith(".txt"));
  const skippedEntries = allEntries.filter((f) => !f.endsWith(".md") && !f.endsWith(".txt"));

  if (skippedEntries.length > 0) {
    console.log(`Note: ${skippedEntries.length} item(s) in ${SOURCE_DIR} were skipped (not .md/.txt):`);
    skippedEntries.forEach((f) => console.log(`  (skipped) ${f}`));
    console.log("");
  }

  if (localFiles.length === 0) {
    console.error(`No .md/.txt files found in ${SOURCE_DIR}. Aborting.`);
    process.exit(1);
  }

  console.log(`Checking for an existing vector store named "${VECTOR_STORE_NAME}"...`);
  const existing = await findExistingStoreByName(VECTOR_STORE_NAME);

  let vectorStoreId;
  let filesToUpload;

  if (!existing) {
    // ---- MODE 1: first run, create fresh ----
    console.log("No existing store found. Creating a new one and uploading all files.\n");
    const vectorStore = await client.vectorStores.create({ name: VECTOR_STORE_NAME });
    vectorStoreId = vectorStore.id;
    filesToUpload = localFiles;
    console.log(`Created vector store: ${vectorStoreId}`);
  } else {
    // ---- MODE 2: incremental update ----
    vectorStoreId = existing.id;
    console.log(`Found existing store: ${vectorStoreId} (created ${new Date(existing.created_at * 1000).toISOString()})`);
    console.log("Checking which files are already attached, and whether any changed...");
    const storeDetails = await listFileDetailsInStore(vectorStoreId);

    const brandNewFiles = [];
    const unchangedFiles = [];
    const changedFiles = []; // same filename, different size -> likely edited locally

    for (const f of localFiles) {
      if (!storeDetails.has(f)) {
        brandNewFiles.push(f);
      } else if (!storeSizeMatches(path.join(SOURCE_DIR, f), storeDetails.get(f).bytes)) {
        changedFiles.push(f);
      } else {
        unchangedFiles.push(f);
      }
    }

    const orphanedInStore = [...storeDetails.keys()].filter((f) => !localFiles.includes(f));

    console.log(`\nLocal files: ${localFiles.length}`);
    console.log(`Unchanged (skipping): ${unchangedFiles.length}`);
    unchangedFiles.forEach((f) => console.log(`  = ${f}`));
    console.log(`New, will upload: ${brandNewFiles.length}`);
    brandNewFiles.forEach((f) => console.log(`  + ${f}`));

    if (changedFiles.length > 0) {
      console.log(
        `\n⚠️  ${changedFiles.length} file(s) have the SAME filename as something ` +
        `already in the store, but a DIFFERENT size - meaning the local content was ` +
        `likely edited since it was last uploaded. This script does NOT overwrite ` +
        `these automatically (OpenAI has no "edit in place" - it requires removing ` +
        `the old file and attaching a new one, which is a destructive action):`
      );
      changedFiles.forEach((f) => console.log(`  ~ ${f} (store: ${storeDetails.get(f).bytes} bytes, local: ${fs.statSync(path.join(SOURCE_DIR, f)).size} bytes)`));
      console.log(
        `\n  To replace these, re-run with:\n` +
        `    $env:REPLACE_CHANGED="true"\n` +
        `    node upload-to-vector-store.mjs`
      );
    }

    if (orphanedInStore.length > 0) {
      console.log(
        `\n${orphanedInStore.length} file(s) exist in the store but were NOT found ` +
        `locally in ${SOURCE_DIR} (not deleted automatically - remove manually in the ` +
        `dashboard if this is intentional):`
      );
      orphanedInStore.forEach((f) => console.log(`  ? ${f}`));
    }

    filesToUpload = [...brandNewFiles];

    if (process.env.REPLACE_CHANGED === "true" && changedFiles.length > 0) {
      console.log(`\nREPLACE_CHANGED=true - removing old versions of ${changedFiles.length} changed file(s) from the store...`);
      for (const f of changedFiles) {
        const { fileId } = storeDetails.get(f);
        await client.vectorStores.files.del(vectorStoreId, fileId);
        console.log(`  Removed old version of: ${f}`);
      }
      filesToUpload.push(...changedFiles);
    }

    if (filesToUpload.length === 0) {
      console.log("\nNothing new to upload. Store is already up to date.");
      console.log("\n" + "=".repeat(60));
      console.log("VECTOR STORE ID (unchanged):");
      console.log(vectorStoreId);
      console.log("=".repeat(60));
      return;
    }
    console.log("");
  }

  // Upload whichever files are actually new
  const fileStreams = filesToUpload.map((f) =>
    fs.createReadStream(path.join(SOURCE_DIR, f))
  );

  console.log(`Uploading ${fileStreams.length} file(s) and waiting for processing...`);
  const uploadResult = await client.vectorStores.fileBatches.uploadAndPoll(
    vectorStoreId,
    { files: fileStreams }
  );

  console.log(`\nUpload batch status: ${uploadResult.status}`);
  console.log(`File counts:`, uploadResult.file_counts);

  if (uploadResult.file_counts.failed > 0) {
    console.warn(
      `\n⚠️  ${uploadResult.file_counts.failed} file(s) failed to process. ` +
      `Check the OpenAI dashboard for this vector store for details.`
    );
  }

  console.log("\n" + "=".repeat(60));
  console.log("VECTOR STORE ID (use this in the admin panel):");
  console.log(vectorStoreId);
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});