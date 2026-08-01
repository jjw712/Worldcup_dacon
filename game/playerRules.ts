import type { RosterPlayer } from "./types";

export const canExchangePlayers = (
  first: Pick<RosterPlayer, "position">,
  second: Pick<RosterPlayer, "position">,
) => (first.position === "GK") === (second.position === "GK");
