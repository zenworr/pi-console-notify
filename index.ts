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

		const methods = [
			["warn", "warning"],
			["error", "error"],
			["log", "info"],
			["info", "info"],
			["debug", "info"],
		] as const;

		shared[OWNER_KEY] = owner;
		const restorers = methods.map(([method, level]) => {
			const original = console[method];
			const wrapped = (...args: unknown[]): void => ctx.ui.notify(format(...args), level);
			console[method] = wrapped;
			return () => {
				if (console[method] === wrapped) console[method] = original;
			};
		});
		restore = () => {
			if (shared[OWNER_KEY] !== owner) return;
			for (const restoreMethod of restorers) restoreMethod();
			delete shared[OWNER_KEY];
		};
	});

	pi.on("session_shutdown", () => {
		restore?.();
		restore = undefined;
	});
}
