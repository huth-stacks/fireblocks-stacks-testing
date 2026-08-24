# Patches applied to Fireblocks v1.3.0 (df7553f) and SDK app-version (ee322b9) for build 1.3.0-stackslabs.1

1. App: EnrollWizard signer step accepts a registered manager instead of requiring a grant from the vault's own key (FBS-173).

```diff
diff --git a/package.json b/package.json
index 983a6b7..3f708c9 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "fireblocks-app",
-  "version": "1.3.0",
+  "version": "1.3.0-stackslabs.1",
   "description": "",
   "author": "Fireblocks",
   "license": "UNLICENSED",
@@ -28,7 +28,6 @@
   "build": {
     "appId": "com.fireblocks.fireblocks-app",
     "productName": "Fireblocks x Stacks",
-    "afterSign": "electron-builder-notarize",
     "files": [
       "dist/**/*",
       "package.json"
@@ -44,11 +43,11 @@
     "mac": {
       "category": "public.app-category.finance",
       "icon": "assets/icons/mac/icon.icns",
-      "hardenedRuntime": true,
+      "hardenedRuntime": false,
       "gatekeeperAssess": false,
       "entitlements": "build/entitlements.mac.plist",
       "entitlementsInherit": "build/entitlements.mac.plist",
-      "identity": "Fireblocks Ltd (2HS962GC9R)",
+      "identity": null,
       "target": [
         {
           "target": "zip",
diff --git a/src/renderer/pages/Staking/EnrollWizard.tsx b/src/renderer/pages/Staking/EnrollWizard.tsx
index d613f13..3f36930 100644
--- a/src/renderer/pages/Staking/EnrollWizard.tsx
+++ b/src/renderer/pages/Staking/EnrollWizard.tsx
@@ -431,7 +431,7 @@ export const EnrollWizard: React.FC<EnrollWizardProps> = ({
         .pox5VerifySignerGrant({ vaultAccountId, signerManager: selectedManager })
         .then((res) => {
           if (cancelled) return;
-          if (res.success && res.ready_to_stake) {
+          if (res.success && res.signer_registered) { // LOCAL TEST PATCH (FBS-173): manager registration, not vault-key grant
             setGrantCheck({ state: "ok" });
           } else {
             setGrantCheck({
```

2. SDK: esbuild.config.mjs BUNDLED gains '@noble/curves' and '@noble/hashes' so the inlined btc-signer 2.x resolves a matching hashes version (FBS-174). dist rebuilt and installed into the app's node_modules/@fireblocks/custom-sdk/dist/index.js.

3. SDK: isValidBtcAddressForNetwork accepts testnet3 (tb1) addresses on the private-devnet (bcrt) profile so a Fireblocks BTC_TEST reward address is usable on private-1 (FBS-170). Test-environment only.

```diff
diff --git a/src/StacksSDK.ts b/src/StacksSDK.ts
index 3bc2771..8b7652f 100644
--- a/src/StacksSDK.ts
+++ b/src/StacksSDK.ts
@@ -4570,6 +4570,11 @@ export class StacksSDK {
       btc.Address(this.btcNetwork).decode(addr);
       return true;
     } catch {
+      // LOCAL TEST PATCH (FBS-170): private-devnet validates bcrt while Fireblocks
+      // BTC_TEST addresses are testnet3 (tb1); same witness program, accept it here.
+      if (this.networkProfile.bech32Prefix === 'bcrt') {
+        try { btc.Address(btc.TEST_NETWORK).decode(addr); return true; } catch { return false; }
+      }
       return false;
     }
   };
```

package.json version set to 1.3.0-stackslabs.1; packaged with electron-builder, unsigned (identity null, hardenedRuntime false, no notarize).
