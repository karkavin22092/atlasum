import { getStore } from "@netlify/blobs";

const sourceSiteId = String(process.env.OLD_NETLIFY_SITE_ID ?? "").trim();
const destinationSiteId = String(process.env.NEW_NETLIFY_SITE_ID ?? "").trim();
const sharedToken = String(process.env.NETLIFY_AUTH_TOKEN ?? "").trim();
const sourceToken = String(process.env.OLD_NETLIFY_AUTH_TOKEN ?? sharedToken).trim();
const destinationToken = String(process.env.NEW_NETLIFY_AUTH_TOKEN ?? sharedToken).trim();
const apply = process.argv.includes("--apply");
const overwrite = process.argv.includes("--overwrite");

const stores = [
  "design-tests-auth-users",
  "design-tests-auth-names",
  "design-tests-leaderboard",
  "design-tests-messages",
  "design-tests-message-inbox",
  "design-tests-notifications",
  "design-tests-bugs",
  "design-tests-reviews",
];

if (!sourceSiteId || !destinationSiteId || !sourceToken || !destinationToken) {
  console.error("Set both site IDs and their Netlify tokens first. NETLIFY_AUTH_TOKEN can be used when one token accesses both sites.");
  process.exit(1);
}
if (sourceSiteId === destinationSiteId) {
  console.error("Source and destination site IDs must be different.");
  process.exit(1);
}

const sourceStore = (name) => getStore({ name, siteID: sourceSiteId, token: sourceToken });
const destinationStore = (name) => getStore({ name, siteID: destinationSiteId, token: destinationToken });

const listAll = async (store) => {
  const entries = [];
  let cursor;
  do {
    const page = await store.list(cursor ? { cursor } : undefined);
    entries.push(...page.blobs);
    cursor = page.cursor;
  } while (cursor);
  return entries;
};

const copyStore = async (name) => {
  const source = sourceStore(name);
  const destination = destinationStore(name);
  const sourceEntries = await listAll(source);
  let copied = 0;
  let skipped = 0;
  let missing = 0;

  for (const entry of sourceEntries) {
    const payload = await source.getWithMetadata(entry.key, { type: "arrayBuffer" });
    if (!payload) {
      missing += 1;
      continue;
    }
    if (!overwrite && await destination.getMetadata(entry.key)) {
      skipped += 1;
      continue;
    }
    if (apply) {
      const options = payload.metadata && typeof payload.metadata === "object"
        ? { metadata: payload.metadata }
        : undefined;
      await destination.set(entry.key, payload.data, options);
    }
    copied += 1;
  }

  console.log(`${name}: source=${sourceEntries.length}, ${apply ? "copied" : "would copy"}=${copied}, skipped=${skipped}, missing=${missing}`);
};

console.log(`${apply ? "Applying" : "Dry run"} migration ${sourceSiteId} -> ${destinationSiteId}${overwrite ? " (overwrite enabled)" : " (existing destination keys are kept)"}`);
for (const name of stores) await copyStore(name);
console.log(apply ? "Migration complete. Sessions were intentionally not copied; users can sign in again." : "Dry run complete. Add --apply to write data.");
