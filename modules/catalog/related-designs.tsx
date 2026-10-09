import { Link } from "@/i18n/routing";
import { Reveal } from "@/modules/shop/home/reveal";

import { DesignCard } from "./design-card";
import { listHouseCollections } from "./house-collections-queries";
import { getPublishedDesigns } from "./queries";
import type { DesignDetailPublic, PublishedDesignCard } from "./types";

const RELATED_COUNT = 4;

/**
 * "You may also like" under the PDP: pieces from the same house collection
 * first, topped up with the newest pieces so the row is never half empty.
 */
export async function RelatedDesigns({
  design,
}: {
  design: DesignDetailPublic;
}) {
  const houseTags = design.tags
    .filter((t) => t.kind === "FREE")
    .map((t) => t.value.toUpperCase());

  const [sameHouse, newest, collections] = await Promise.all([
    houseTags.length > 0
      ? getPublishedDesigns({
          filters: { freeTags: houseTags },
          sort: "newest",
          pageSize: RELATED_COUNT + 1,
        })
      : Promise.resolve({ items: [] as PublishedDesignCard[] }),
    getPublishedDesigns({ sort: "newest", pageSize: RELATED_COUNT * 2 + 1 }),
    listHouseCollections({ activeOnly: true }),
  ]);

  const picked: PublishedDesignCard[] = [];
  const seen = new Set([design.id]);
  for (const item of [...sameHouse.items, ...newest.items]) {
    if (picked.length >= RELATED_COUNT) break;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    picked.push(item);
  }
  if (picked.length === 0) return null;

  const doorLabels: Record<string, string> = Object.fromEntries(
    collections.map((c) => [c.tag, c.navLabel]),
  );
  doorLabels.WHITE_COLLECTION =
    collections.find((c) => c.slug === "signature")?.navLabel ?? "Signature";

  return (
    <Reveal as="section" className="pdp-related" id="related">
      <div className="edit-head">
        <div className="edit-head-copy">
          <span className="eyebrow">Complete the look</span>
          <h2 className="serif">You may also like</h2>
        </div>
        <Link href="/collections/all" className="edit-explore">
          View all pieces
        </Link>
      </div>
      <div className="product-grid pdp-related-grid">
        {picked.map((item, i) => (
          <div
            key={item.id}
            className="pdp-related-item"
            style={{ ["--mosaic-i" as string]: String(i) }}
          >
            <DesignCard design={item} doorLabels={doorLabels} />
          </div>
        ))}
      </div>
    </Reveal>
  );
}
