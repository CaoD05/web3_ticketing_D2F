# Sapphire Testnet Verification Guide

## ⚠️ Important Issue: Encrypted Deployment Blocks Verification

Your current `hardhat.config.js` has `require("@oasisprotocol/sapphire-hardhat")` at the top, which causes **encrypted contract deployment transactions**. This prevents Sourcify verification from working.

## Solution: Deploy Without Encryption for Verifiable Contracts

### Option 1: Quick Fix - Comment Out Sapphire Plugin for Deployment

1. **Temporarily disable encryption in `hardhat.config.js`:**
   ```javascript
   // TEMPORARILY COMMENT OUT for clean deployment:
   // require("@oasisprotocol/sapphire-hardhat");
   ```

2. **Deploy the contract:**
   ```bash
   npm run deploy:testnet
   ```

3. **Re-enable encryption (optional - only if needed for runtime):**
   ```javascript
   require("@oasisprotocol/sapphire-hardhat");
   ```

4. **Verify the contract:**
   ```bash
   npx hardhat verify --network sapphireTestnet 0x111C3219689f89BA9Cb79f65922C45ac78FD51Bf
   ```

### Option 2: Use Unencrypted Deployment Script (Recommended)

We've created `scripts/deploy-unencrypted.js` that handles this automatically.

```bash
npx hardhat run scripts/deploy-unencrypted.js --network sapphireTestnet
```

This script:
- ✓ Disables encryption temporarily
- ✓ Deploys the contract
- ✓ Saves deployment info
- ✓ Re-enables encryption (if using confidential features later)

## Manual Verification on Sourcify

If hardhat verify doesn't work, you can manually verify on Sourcify:

1. Visit: https://sourcify.dev/
2. Click "VERIFY CONTRACT"
3. Select "Oasis Sapphire Testnet" from the chain dropdown
4. Enter your contract address: `0x111C3219689f89BA9Cb79f65922C45ac78FD51Bf`
5. Select "Hardhat" as the framework
6. Upload the build-info JSON file from `artifacts/build-info/` (the hex-named file)
7. Select your contract from the dropdown (if multiple)
8. Click "Verify Contract"

## Viewing Verified Contract

Once verified, view it at:
https://explorer.oasis.io/testnet/sapphire/address/0x111C3219689f89BA9Cb79f65922C45ac78FD51Bf

## Why This Matters

- **Encrypted deployment** = Unverifiable (breaks Sourcify, can't see source on explorer)
- **Unencrypted deployment** = Verifiable (works with Sourcify, source visible)

For dApps that need user transparency, verification is important. Use unencrypted deployment for verification, then enable encryption only if you need contract-level confidentiality.

## For Future Deployments

Add this npm script to `package.json` for easier unencrypted deployments:

```json
"deploy:testnet:verify": "node scripts/deploy-unencrypted.js",
```

Then run:
```bash
npm run deploy:testnet:verify
```
