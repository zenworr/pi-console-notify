# pi-console-notify

Route `console.warn()`, `console.error()`, `console.log()`, `console.info()`, and `console.debug()` through Pi's notification UI. This prevents raw console output from overwriting the terminal input area.

## Install

```sh
pi install git:github.com/zenworr/pi-console-notify
```

Run `/reload` in an existing Pi session, or start a new session.

## Behavior

- `console.warn()` becomes a warning notification.
- `console.error()` becomes an error notification.
- `console.log()`, `console.info()`, and `console.debug()` become info notifications.
- Arguments use Node's `util.format()`, including format strings, objects, and error stacks.
- Notifications appear in Pi's conversation area, not as floating toasts. Pi replaces consecutive info notifications with the latest message.
- In-process subagents use the parent session's notification UI.
- Session shutdown restores the console methods. Reload installs a new wrapper without stacking wrappers.
- RPC, JSON, and print sessions do not install the wrapper.

No configuration is required.

## Limits

The wrapper is process-wide. It also captures calls from libraries, not only extensions. It starts at `session_start`, so earlier startup messages are not captured.

Direct writes to stdout or stderr and subprocess output are unchanged. The extension changes how warnings are displayed; it does not fix their causes.

## Development

Requires Node.js 22.18 or later.

```sh
npm test
```

## License

MIT. See [LICENSE](LICENSE).
