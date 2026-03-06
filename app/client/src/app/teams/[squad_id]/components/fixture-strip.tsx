"use client";

import {
  FixtureStrip as SharedFixtureStrip,
  type FixtureStripProps,
} from "../../../players/[player_id]/components/fixture-strip";

export function FixtureStrip(props: FixtureStripProps) {
  return <SharedFixtureStrip {...props} showFullDrawModal />;
}
