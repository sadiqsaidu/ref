import type { RefEvent } from "./types";

export function eventKey(e: RefEvent): string {
	return [
		e.id,
		e.ts,
		e.minute ?? "",
		e.phase,
		e.team ?? "",
		e.kind,
		e.detail,
	].join("|");
}