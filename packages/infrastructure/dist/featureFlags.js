"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEnabled = isEnabled;
exports.listFlags = listFlags;
const env_1 = require("./env");
const flags = (0, env_1.parseFeatureFlags)((0, env_1.loadEnv)().FEATURE_FLAGS);
function isEnabled(flag, defaultValue = false) {
    if (flag in flags)
        return flags[flag];
    return defaultValue;
}
function listFlags() {
    return { ...flags };
}
