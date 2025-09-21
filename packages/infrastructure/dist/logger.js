"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.withRequestContext = withRequestContext;
const pino_1 = __importDefault(require("pino"));
const env_1 = require("./env");
const env = (0, env_1.loadEnv)();
exports.logger = (0, pino_1.default)({
    level: env.LOG_LEVEL,
    base: undefined, // omit pid, hostname for lean logs
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
    messageKey: 'message'
});
function withRequestContext(context) {
    return exports.logger.child({ ...context });
}
