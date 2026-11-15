import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Catalog pages change on rebuild. Live orders/auth stay dynamic and uncached.
// No R2, KV, D1, Images, queues or Durable Objects need to be provisioned.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
