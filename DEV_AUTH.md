# Local development sign-in

On `localhost`, `127.0.0.1`, or `::1` only, SANA restores a normal session for the configured local test user when a page asks for the current user. This makes CSS/HTML reloads and local static-server restarts keep working without repeated sign-in.

- The default local test user is the seeded `Xinyao1021` account.
- No password is used or exposed by the auto-login logic.
- Explicit Logout disables local auto-login by setting `sana_dev_auto_login_disabled` in that browser. A normal manual login enables it again.
- To use a different existing local account, set `localStorage.sana_dev_username` in browser devtools.

The restoration code is hostname-gated: deployed hosts never enter it. Production authentication retains its normal explicit-login behavior.
