import {
  createSearchParamsCache,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

import { TIME_RANGE_PRESETS } from "./time-range";

/** Base range parser (nullable, no default) — the supertype that both the
 *  defaulted variant and a page's opt-in (no-default) range satisfy. */
export const rangeBaseParser = parseAsStringLiteral(TIME_RANGE_PRESETS);

/** Shared URL keys for analysis time filters. */
export const timeRangeParsers = {
  range: rangeBaseParser.withDefault("month"),
  from: parseAsString,
  to: parseAsString,
};

export const timeRangeSearchParamsCache = createSearchParamsCache(
  timeRangeParsers,
);

/** Client/server parsers object for useQueryStates. */
export const timeRangeNuqsParsers = timeRangeParsers;
