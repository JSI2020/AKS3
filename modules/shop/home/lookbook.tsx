import Image from "next/image";

import { Link } from "@/i18n/routing";
import { Money } from "@/modules/ui";
import type { PublishedDesignCard } from "@/modules/catalog/types";
import {
  resolveDisplayPrice,
} from "@/modules/catalog/pricing";

import { Reveal } from "./reveal";

export function Lookbook({
  design,
  imageUrl,
  eyebrow,
  line,
  cta,
}: {
  design: PublishedDesignCard | null;
  /** Prefer a lifestyle/hero still; falls back to design thumbnail. */
  imageUrl: string | null;
  eyebrow: string;
  line: string;
  cta: string;
}) {
  if (!design || !imageUrl) return null;

  const display = resolveDisplayPrice({
    basePriceMinor: design.basePriceMinor,
    compareAtPriceMinor: design.compareAtPriceMinor,
    compareAtStartsAt: design.compareAtStartsAt,
    compareAtEndsAt: design.compareAtEndsAt,
  });

  return (
    <Reveal as="section" className="lookbook" id="lookbook">
      <div className="lookbook-stage">
        <div className="lookbook-media">
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-[center_30%]"
            unoptimized
          />
        </div>
        <div className="lookbook-shade" aria-hidden />
        <div className="lookbook-copy">
          <span className="eyebrow">{eyebrow}</span>
          <p className="lookbook-line">{line}</p>
        </div>
        <Link
          href={`/designs/${design.slug}`}
          className="lookbook-card"
        >
          <span className="lookbook-card-name serif">{design.name}</span>
          <span className="lookbook-card-price">
            <Money value={display.priceMinor} />
          </span>
          <span className="lookbook-card-cta">{cta}</span>
        </Link>
      </div>
    </Reveal>
  );
}
