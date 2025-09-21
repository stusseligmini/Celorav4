import { logger } from './logger';

interface RotationSchedule {
  dailyRotation?: { enabled: boolean; time: string; timezone?: string };
  weeklyRotation?: { enabled: boolean; day: string; time: string };
  emergencyRotation?: { enabled: boolean; triggers: string[] };
}
interface MasterKeyMeta { keyId: string; algorithm: string; created: string; rotationSchedule?: string; backupLocations?: string[]; }

export interface ActiveKeyInfo extends MasterKeyMeta { loadedAt: Date; };

export class KeyRegistry {
  private masterKeyPath: string;
  private schedulePath: string;
  private cache: ActiveKeyInfo | null = null;
  
  constructor(baseSecureDir?: string) {
    // Only initialize paths on server side
    if (typeof window === 'undefined') {
      const path = require('path');
      const defaultDir = path.join(process.cwd(), 'secure', 'quantum-vault');
      this.masterKeyPath = path.join(baseSecureDir || defaultDir, 'master-keys.json');
      this.schedulePath = path.join(baseSecureDir || defaultDir, 'rotation-schedule.json');
    } else {
      this.masterKeyPath = '';
      this.schedulePath = '';
    }
  }
  
  load(): ActiveKeyInfo | null {
    if (typeof window !== 'undefined') {
      logger.warn('KeyRegistry.load() called on client side');
      return null;
    }
    
    try {
      const fs = require('fs');
      const masterRaw = fs.readFileSync(this.masterKeyPath, 'utf8');
      const master: MasterKeyMeta = JSON.parse(masterRaw);
      this.cache = { ...master, loadedAt: new Date() };
      return this.cache;
    } catch (e) {
      logger.error({ error: (e as Error).message }, 'Failed to load master key metadata');
      return null;
    }
  }
  
  getActiveKey(): ActiveKeyInfo | null { 
    return this.cache || this.load(); 
  }
  
  getRotationSchedule(): RotationSchedule | null {
    if (typeof window !== 'undefined') {
      logger.warn('KeyRegistry.getRotationSchedule() called on client side');
      return null;
    }
    
    try { 
      const fs = require('fs');
      return JSON.parse(fs.readFileSync(this.schedulePath, 'utf8')); 
    } catch { 
      return null; 
    }
  }
}

export class ActiveKeyResolver {
  constructor(private registry: KeyRegistry = new KeyRegistry()) {}
  resolve(): ActiveKeyInfo | null { return this.registry.getActiveKey(); }
}
