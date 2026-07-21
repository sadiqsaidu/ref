import type { RefEvent, RefKind } from "./types";

// Most events are safe to key by their feed sequence id: cards, goals and
// corners come from cumulative counters (a duplicate record produces no new
// increment, so it never re-fires), while penalties and free kicks must stay
// distinct to keep shootouts and the foul proxy accurate. VAR reviews,
// corrections and phase changes are the ones the feed can genuinely re-send
// under a fresh sequence id, so they are keyed by a semantic signature —
// minute, team, kind, detail — which collapses the duplicate rows users see
// without ever merging two separate calls.
const SEMANTIC_KEYED = new Set<RefKind>([
	"var_start",
	"var_end",
	"amend",
	"phase_change",
]);

export function eventKey(e: RefEvent): string {
	if (SEMANTIC_KEYED.has(e.kind)) {
		return ["sig", e.kind, e.team ?? "", e.minute ?? "", e.phase, e.detail].join("|");
	}
	return `id:${e.id}`;
}
