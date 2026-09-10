import { format } from "node:util";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const OWNER_KEY = Symbol.for("pi-console-notify.owner");
const shared = globalThis as typeof globalThis & { [OWNER_KEY]?: object };

export default function consoleNotify(pi: ExtensionAPI): void {
	const owner = {};
	let restore: (() => void) | undefined;

	pi.on("session_start", (_event, ctx) => {
		// Child sessions share the console but must not replace the parent UI sink.
		if (ctx.mode !== "tui" || shared[OWNER_KEY]) return;

		const originalWarn = console.warn;
		const originalError = console.error;
		const warn = (...args: unknown[]): void => ctx.ui.notify(format(...args), "warning");
		const error = (...args: unknown[]): void => ctx.ui.notify(format(...args), "error");

		shared[OWNER_KEY] = owner;
		console.warn = warn;
		console.error = error;
		restore = () => {
			if (shared[OWNER_KEY] !== owner) return;
			if (console.warn === warn) console.warn = originalWarn;
			if (console.error === error) console.error = originalError;
			delete shared[OWNER_KEY];
		};
	});

	pi.on("session_shutdown", () => {
		restore?.();
		restore = undefined;
	});
}
