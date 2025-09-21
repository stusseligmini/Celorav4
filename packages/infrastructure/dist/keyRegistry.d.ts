interface RotationSchedule {
    dailyRotation?: {
        enabled: boolean;
        time: string;
        timezone?: string;
    };
    weeklyRotation?: {
        enabled: boolean;
        day: string;
        time: string;
    };
    emergencyRotation?: {
        enabled: boolean;
        triggers: string[];
    };
}
interface MasterKeyMeta {
    keyId: string;
    algorithm: string;
    created: string;
    rotationSchedule?: string;
    backupLocations?: string[];
}
export interface ActiveKeyInfo extends MasterKeyMeta {
    loadedAt: Date;
}
export declare class KeyRegistry {
    private masterKeyPath;
    private schedulePath;
    private cache;
    constructor(baseSecureDir?: string);
    load(): ActiveKeyInfo | null;
    getActiveKey(): ActiveKeyInfo | null;
    getRotationSchedule(): RotationSchedule | null;
}
export declare class ActiveKeyResolver {
    private registry;
    constructor(registry?: KeyRegistry);
    resolve(): ActiveKeyInfo | null;
}
export {};
