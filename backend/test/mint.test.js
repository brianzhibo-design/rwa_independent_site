import test from 'node:test';
import assert from 'node:assert/strict';
import { mint1155 } from '../src/services/chain/mint.js';

// 1. invalid address should reject
test('mint1155 rejects invalid address', async () => {
  await assert.rejects(() => mint1155('invalid', 1), {
    message: 'invalid wallet address'
  });
});

// 2. unsupported chain id should reject
test('mint1155 rejects unsupported chain id', async () => {
  process.env.CHAIN_RPC_URL = 'https://example.com';
  process.env.RWA_ERC1155_ADDRESS = '0x0000000000000000000000000000000000000001';
  process.env.PRIVATE_KEY = '0x' + '1'.repeat(64);
  process.env.CHAIN_ID = '9999';
  await assert.rejects(
    () => mint1155('0x0000000000000000000000000000000000000002', 1),
    /unsupported chain id/
  );
});
