"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditEvent = exports.LedgerDomain = exports.TransactionStatus = exports.TransactionType = exports.TransactionSchema = void 0;
__exportStar(require("./virtualCard"), exports);
__exportStar(require("./database"), exports);
// Explicit re-exports to avoid symbol collisions with any generated Database types
var transaction_1 = require("./transaction");
Object.defineProperty(exports, "TransactionSchema", { enumerable: true, get: function () { return transaction_1.DomainTransaction; } });
Object.defineProperty(exports, "TransactionType", { enumerable: true, get: function () { return transaction_1.TransactionType; } });
Object.defineProperty(exports, "TransactionStatus", { enumerable: true, get: function () { return transaction_1.TransactionStatus; } });
Object.defineProperty(exports, "LedgerDomain", { enumerable: true, get: function () { return transaction_1.LedgerDomain; } });
Object.defineProperty(exports, "createAuditEvent", { enumerable: true, get: function () { return transaction_1.createAuditEvent; } });
