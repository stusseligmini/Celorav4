"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const crypto_1 = require("../crypto");
(0, vitest_1.describe)('crypto encryption', () => {
    (0, vitest_1.it)('round trips a string', async () => {
        const plain = 'test-secret-data';
        const key = 'user-key-material';
        const enc = await (0, crypto_1.encryptString)(plain, key);
        const dec = await (0, crypto_1.decryptString)(enc, key);
        (0, vitest_1.expect)(dec).toBe(plain);
    });
});
