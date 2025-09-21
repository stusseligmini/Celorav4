"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActiveKeyResolver = exports.KeyRegistry = void 0;
const logger_1 = require("./logger");
;
class KeyRegistry {
    masterKeyPath;
    schedulePath;
    cache = null;
    constructor(baseSecureDir) {
        // Only initialize paths on server side
        if (typeof window === 'undefined') {
            const path = require('path');
            const defaultDir = path.join(process.cwd(), 'secure', 'quantum-vault');
            this.masterKeyPath = path.join(baseSecureDir || defaultDir, 'master-keys.json');
            this.schedulePath = path.join(baseSecureDir || defaultDir, 'rotation-schedule.json');
        }
        else {
            this.masterKeyPath = '';
            this.schedulePath = '';
        }
    }
    load() {
        if (typeof window !== 'undefined') {
            logger_1.logger.warn('KeyRegistry.load() called on client side');
            return null;
        }
        try {
            const fs = require('fs');
            const masterRaw = fs.readFileSync(this.masterKeyPath, 'utf8');
            const master = JSON.parse(masterRaw);
            this.cache = { ...master, loadedAt: new Date() };
            return this.cache;
        }
        catch (e) {
            logger_1.logger.error({ error: e.message }, 'Failed to load master key metadata');
            return null;
        }
    }
    getActiveKey() {
        return this.cache || this.load();
    }
    getRotationSchedule() {
        if (typeof window !== 'undefined') {
            logger_1.logger.warn('KeyRegistry.getRotationSchedule() called on client side');
            return null;
        }
        try {
            const fs = require('fs');
            return JSON.parse(fs.readFileSync(this.schedulePath, 'utf8'));
        }
        catch {
            return null;
        }
    }
}
exports.KeyRegistry = KeyRegistry;
class ActiveKeyResolver {
    registry;
    constructor(registry = new KeyRegistry()) {
        this.registry = registry;
    }
    resolve() { return this.registry.getActiveKey(); }
}
exports.ActiveKeyResolver = ActiveKeyResolver;
