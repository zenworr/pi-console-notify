import assert from "node:assert/strict";
import { test } from "node:test";
import { format } from "node:util";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import consoleNotify from "./index.ts";

function session(mode: ExtensionContext["mode"] = "tui") {
	const handlers = new Map<string, Function>();
	const notices: { message: string; type: string }[] = [];
	consoleNotify({
		on: (event: string, handler: Function) => handlers.set(event, handler),
	} as unknown as ExtensionAPI);
	return {
		notices,
		start: () => handlers.get("session_start")!({}, {
			mode,
			ui: { notify: (message: string, type: string) => notices.push({ message, type }) },
		}),
		stop: () => handlers.get("session_shutdown")!({}),
	};
}

test("routes console warnings and errors with Node formatting", () => {
	const parent = session();
	const originalWarn = console.warn;
	const originalError = console.error;
	const originalLog = console.log;
	parent.start();
	try {
		console.warn("Duplicate %s (%d)", "pi-chrome", 2);
		const error = new Error("Failed");
		console.error(error, { extension: "example" });
		assert.deepEqual(parent.notices, [
			{ message: "Duplicate pi-chrome (2)", type: "warning" },
			{ message: format(error, { extension: "example" }), type: "error" },
		]);
		assert.equal(console.log, originalLog);
	} finally {
		parent.stop();
	}
	assert.equal(console.warn, originalWarn);
	assert.equal(console.error, originalError);
});

test("child initialization and shutdown retain the parent sink", () => {
	const parent = session();
	parent.start();
	try {
		const warn = console.warn;
		console.warn("pi-chrome already loaded; skipping duplicate");
		const child = session();
		child.start();
		child.stop();
		parent.start();
		assert.equal(console.warn, warn);
		console.error("Child error");
		assert.equal(parent.notices.length, 2);
		assert.equal(child.notices.length, 0);
	} finally {
		parent.stop();
	}
});

test("reload routes to the new session without stacking wrappers", () => {
	const old = session();
	const originalWarn = console.warn;
	old.start();
	old.stop();
	const current = session();
	current.start();
	try {
		old.stop();
		console.warn("After reload");
		assert.equal(old.notices.length, 0);
		assert.equal(current.notices.length, 1);
	} finally {
		current.stop();
	}
	assert.equal(console.warn, originalWarn);
});

test("leaves RPC, JSON and print consoles unchanged", () => {
	for (const mode of ["rpc", "json", "print"] as const) {
		const other = session(mode);
		const warn = console.warn;
		const error = console.error;
		other.start();
		other.stop();
		assert.equal(console.warn, warn);
		assert.equal(console.error, error);
		assert.equal(other.notices.length, 0);
	}
});

test("shutdown does not overwrite a later console replacement", () => {
	const originalWarn = console.warn;
	const parent = session();
	parent.start();
	const later = () => {};
	try {
		console.warn = later;
		parent.stop();
		assert.equal(console.warn, later);
	} finally {
		parent.stop();
		console.warn = originalWarn;
	}
});
