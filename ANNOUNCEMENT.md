# Fireblocks x Stacks: internal testing on private-1 (patched v1.3.0)

Fireblocks shipped v1.3.0 of their desktop app with the Phase 1 Bitcoin staking flow: enroll native BTC from a vault into a PoX-5 bond with paired STX, choose a reward destination vault, see the position. We reviewed it, then ran the whole lifecycle on private-1 today from vault 5: enroll (bond #182), announce early exit, cosigned spend back to the vault.

Two bugs in the shipped build stop anyone else from doing that (the signer step rejects every vault that isn't the manager's own signer, and the BTC recovery path throws on address derivation). Both are reported to Fireblocks with fixes. Until their build lands, we test on our own patched copy.

## What you get

- **Build:** `Fireblocks x Stacks-1.3.0-stackslabs.1-arm64-mac.zip` (Apple Silicon, unsigned), sha256 `e13794a2878b2c357796805dae289adcbe12c2cce498b9d5fde4ae2b613d4ed1`. Link in the channel post. It is the official v1.3.0 source plus three small patches (`patches.md` in this gist); it installs over the official app.
- **Credential:** one shared Fireblocks testnet API user, in `credentials.md` in this gist (API key plus the private key to save as `private-key.pem`). Every install uses the same one; use one vault per person so results are attributable.
- **Network:** private-1, `https://api.private-1.hiro.so`. Signer manager to pick in the app: `STM0NRFQG1Q4WNNTQ8YMSX4QGS16PSCTDHFTDMTA.signer-manager`.

## Install and register (5 minutes)

1. Unzip, move `Fireblocks x Stacks.app` to Applications. First open: right-click → Open (it is unsigned; macOS will warn once). If it refuses: `xattr -d com.apple.quarantine "/Applications/Fireblocks x Stacks.app"`.
2. Get Started → "Upload API Key" tab (the default): paste the API key, upload the `.pem`, Save. The app validates the pair against Fireblocks.
3. Hiro key: Skip for now.
4. Settings → Change Network → Confirm. **A fresh install starts on mainnet.** You want the orange "You are viewing testnet" banner.
5. Accounts → pick a vault account nobody else is using (post which one in the channel). Open it, copy the STX address.
6. Add a row to the allowlist sheet, tab "B-XYZ (upcoming)": Partner = your name, Address = that STX address, Alloc = 1. https://docs.google.com/spreadsheets/d/1FShl-PLTmzbWIKn0Mvqh89SPI7ynbOwsELSEgBoIjv4/edit
   The list is read when each new bond is set up (no add-after), so you are in from the next bond, roughly every couple of hours. The Staking page says "Enrollment open" when you are.

## What to test

1. Staking page → Enroll in bond. Pre-flight (faucet funding is fine), reward asset (try **native BTC to a different vault account**; sBTC also works), signer = the manager above, Authorize. Two Touch ID prompts.
2. Success screen shows both transaction ids. Confirm the position card and the vault page agree.
3. Quit the app mid-enrollment once and use "Resume enrollment".
4. Vault page → Manage bond → Announce Early Exit → Complete Early Exit. The BTC comes back to the vault's own address.
5. STX-only: vault page → Stack STX: stake, increase, extend, unstake.
6. Bad inputs: wrong txid, a manager with no grant, a vault that is not allowlisted. All should refuse before Touch ID.
Do not switch to mainnet.

## Known, already reported (don't refile)

- Amounts: the faucet funds 10,000 sats; the wizard and Activity show the amount you typed (FBS-69), and after an early exit the card shows that typed amount as "locked" (FBS-163).
- Activity shows the STX leg as "50 sats" (FBS-164). "Stacking Submitted" after every operation in the legacy modal (UX-56).
- Position count can duplicate on refresh (FBS-172). Resume with no recorded txid is blocked by the balance check (FBS-159).
- Claims, renewal, withdrawal at maturity and history are not in Phase 1.
- Full list: https://github.com/stx-labs/fireblocks-stacks-v110-review (ask if you need access).

## Report

Vault id, bond number, both transaction ids, a screenshot, what you expected. Post in the channel; we file. Anything that touches funds, ping Alexander directly.

## Bring your Claude

`CLAUDE-HANDOFF.md` in this gist is a prompt you can paste into Claude Code on your machine. It installs, registers, drives the app end to end, and writes up evidence in the format we use. `rawcdp.js` is the driver it uses.
