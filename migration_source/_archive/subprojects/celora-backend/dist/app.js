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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connection = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const web3_js_1 = require("@solana/web3.js");
const cors_1 = __importDefault(require("cors"));
const web3_js_2 = require("@solana/web3.js");
const dotenv = __importStar(require("dotenv"));
const cards_1 = require("./routes/cards");
const transactions_1 = require("./routes/transactions");
const errorHandler_1 = require("./middleware/errorHandler");
dotenv.config();
exports.app = (0, express_1.default)();
exports.connection = new web3_js_2.Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
exports.app.use((0, cors_1.default)());
exports.app.use(express_1.default.json());
const validateSolanaAddress = (req, res, next) => {
    const solanaAddress = req.body.solanaAddress || req.query.solanaAddress;
    if (!solanaAddress) {
        res.status(400).json({ error: 'Solana address is required' });
        return;
    }
    try {
        new web3_js_1.PublicKey(solanaAddress);
        next();
    }
    catch (error) {
        res.status(400).json({ error: 'Invalid Solana address' });
        return;
    }
};
exports.app.use('/api', validateSolanaAddress);
exports.app.use('/api/cards', cards_1.cardRoutes);
exports.app.use('/api/transactions', transactions_1.transactionRoutes);
exports.app.use(errorHandler_1.errorHandler);
//# sourceMappingURL=app.js.map