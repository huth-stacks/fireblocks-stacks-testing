# Handoff for Claude Code: test the Fireblocks x Stacks app on private-1

Paste everything below this line into Claude Code on a Mac with Apple Silicon, after downloading the build zip from the channel post. Save the API key and the private key from credentials.md in this gist as api-key.txt and private-key.pem in a folder. Replace the two placeholders.

---

You are helping me test the Fireblocks x Stacks desktop app (patched build 1.3.0-stackslabs.1) against the Stacks PoX-5 private testnet (private-1). Work through the steps in order, stop at each point marked STOP and tell me what you see, and never do anything on mainnet. I will be at the keyboard for Touch ID prompts. My vault account number is: <VAULT_ID>. The credential files are at: <PATH_TO_FOLDER containing api-key.txt and private-key.pem>.

## Background you need

- The app is an Electron app. It talks to Fireblocks (custody, RAW signing) and to the Stacks node at https://api.private-1.hiro.so (chain id 256, PoX-5 at ST000000000000000000002AMW42H.pox-5). Bitcoin on private-1 is regtest; the Esplora is https://mempool.bitcoin.private-1.hiro.so/api.
- Phase 1 flow: enroll native BTC from a vault into a bond (BTC goes to a P2WSH lock address, a paired amount of STX is locked on Stacks), optionally direct rewards to another vault account, see the position. Early exit is announce (Stacks tx) then a cosigned Bitcoin spend. Claims, renewal and history are out of scope for Phase 1.
- The app's lock records and signing are authoritative in the SDK inside the app; nothing you do in the renderer can move funds without Touch ID.
- Signer manager to use at the signer step: STM0NRFQG1Q4WNNTQ8YMSX4QGS16PSCTDHFTDMTA.signer-manager
- A fresh install defaults to mainnet. Switching to testnet is a required step.

## Step 1: install and register

1. Verify the zip's sha256 is e13794a2878b2c357796805dae289adcbe12c2cce498b9d5fde4ae2b613d4ed1, unzip, move "Fireblocks x Stacks.app" to /Applications. If an older "Fireblocks x Stacks.app" exists, move it to ~/Downloads first.
2. Clear quarantine so the unsigned app opens: `xattr -d com.apple.quarantine "/Applications/Fireblocks x Stacks.app"` (ignore "No such xattr").
3. Launch with a debugging port so you can drive it: `open -a "/Applications/Fireblocks x Stacks.app" --args --remote-debugging-port=9222`. Confirm `curl -s http://127.0.0.1:9222/json/version` shows FireblocksxStacks/1.3.0-stackslabs.1.
4. Driver: save rawcdp.js from the gist into a scratch folder, `npm init -y && npm i ws` there, then run it as a command loop: `mkfifo cmd.fifo; (tail -f cmd.fifo | node rawcdp.js > out.log 2>&1 &)`. Commands are one per line written to cmd.fifo: `eval <js>`, `dom`, `clicktext <visible text>`, `click <css>`, `text <css> <value>`, `file <css> <absolute path>`, `shot <name>`. Read results from out.log. Playwright and puppeteer do not attach to this Electron; use the raw client. Screenshots can hang if the window is occluded; bring the app to the front with `osascript -e 'tell application "Fireblocks x Stacks" to activate'` first.
5. Registration through the driver: `clicktext Get Started`; on the API key page the default tab is "Upload API Key": `text #apiKey <api key>`, `file input[type=file] <abs path to private-key.pem>`, `clicktext Save API Key`. It validates against Fireblocks and moves to the Hiro key page; `clicktext Skip for now`. After a route change the driver's pending call can hang; restart it (kill node, relaunch the loop) and continue.
6. Switch network: go to Settings (click the sidebar button whose text is "Settings"), `clicktext Change Network`, then click the dialog's Confirm button via eval. Verify `document.body.innerText.includes('viewing testnet')` is true.
STOP: tell me the vault list you see and which vault you will use.

## Step 2: allowlist and bond

7. Open the vault page (`eval location.hash='#/vaults/<VAULT_ID>'`) and read the STX ADDRESS. Tell me the address; I will add it to the allowlist sheet (or I already did).
8. On the Staking page (`#/staking`), select the vault in the picker. If the bond card says "Access required", we wait for the next bond (check every 30 minutes; do not poll faster than that). When it says "Enrollment open", continue.

## Step 3: enroll

9. `clicktext Enroll in bond`. Step 1 (Pre-flight): leave the default amount, funding = "Fund via testnet faucet", read the readiness checks and tell me any that are not green. Continue.
10. Step 2 (Reward asset): choose "Receive native BTC", then in "Reward destination vault" pick a DIFFERENT vault account than the enrolling one (ask me which). Confirm the "Verified reward destination" shows that vault and an address, leave the fee budget at 5000. Continue.
11. Step 3 (Signer): `text input[placeholder*="signer-manager"] STM0NRFQG1Q4WNNTQ8YMSX4QGS16PSCTDHFTDMTA.signer-manager`. Both signer checks should pass. Continue.
12. Step 4 (Authorize): read the whole review block and tell me every row. STOP and wait for my go.
13. On go: click "Authorize enrollment". I will approve Touch ID. Poll the dialog text every 45 seconds until it says "You enrolled" or shows Failed/unsettled. Record the Bitcoin and Stacks transaction ids (they are in localStorage key `pox5-enrollment-history:private-testnet` in full).
14. Validate on chain: GET the Bitcoin tx from the Esplora (`/tx/<txid>`) and the Stacks tx from `https://api.private-1.hiro.so/extended/v1/tx/0x<txid>`; confirm both are confirmed/success. Then read `get-bond-membership` for the vault's STX address through `/v2/contracts/call-read/ST000000000000000000002AMW42H/pox-5/get-bond-membership` (argument: the serialized standard principal) and confirm a membership exists with the bond index. Also call `pox5GetCommittedRewardAddress` through the app (`eval (async()=>JSON.stringify(await window.api.pox5GetCommittedRewardAddress({vaultAccountId:'<VAULT_ID>'})))()`) and confirm it returns the reward vault's address.
STOP: report the txids, the membership, and the committed reward address.

## Step 4: early exit

15. Vault page → `clicktext Manage bond`. The modal shows the position; click "Announce Early Exit". I approve Touch ID. Wait for "Transaction Hash"; record it. Close the activity overlay if one opens.
16. Click "Complete Early Exit", then "Send BTC" (destination = the vault's own address, fee 500). I approve Touch ID. Record the Bitcoin txid and confirm on the Esplora that it spends the lock output to the vault's address.
STOP: report both txids and what the position card shows afterwards.

## Step 5: write it up

17. Produce a markdown report with: vault id, bond index, every transaction id with a one-line status, the reward destination as shown in the app and as committed on chain, anything that said "Failed", "Unavailable", "Unknown" or looked wrong, and screenshots of the authorize screen, the success screen and the post-exit position card. Known issues already filed, do not re-report: typed amount shown instead of the 10,000 sats actually locked; "50 sats" for the STX leg; "Stacking Submitted" heading; position count duplicating on refresh; resume blocked when no txid was recorded.
18. Post the report in the channel.

Rules: never switch the app to mainnet; never type a Bitcoin address by hand anywhere; never click anything labelled Clear All Credentials; if something asks for a password, stop and ask me; if a step fails twice, stop and report rather than retrying.
