/**
 * File storage service for JSON persistence
 * Handles reading/writing platform, scenario, and session data
 */
import type { ISAMSystem, IFighterPlatform, IScenario, ISession } from '../types/index.js';
/**
 * Initialize all data directories
 */
export declare function initializeDataDirectories(): Promise<void>;
export declare function saveSAMPlatform(platform: ISAMSystem): Promise<void>;
export declare function saveFighterPlatform(platform: IFighterPlatform): Promise<void>;
export declare function loadSAMPlatform(id: string): Promise<ISAMSystem | null>;
export declare function loadFighterPlatform(id: string): Promise<IFighterPlatform | null>;
export declare function listAllPlatforms(): Promise<{
    sams: ISAMSystem[];
    fighters: IFighterPlatform[];
}>;
export declare function deletePlatform(id: string, type: 'sam' | 'fighter'): Promise<boolean>;
export declare function saveScenario(scenario: IScenario): Promise<void>;
export declare function loadScenario(id: string): Promise<IScenario | null>;
export declare function listAllScenarios(): Promise<IScenario[]>;
export declare function deleteScenario(id: string): Promise<boolean>;
export declare function saveSession(session: ISession): Promise<void>;
export declare function loadSession(id: string): Promise<ISession | null>;
export declare function deleteSession(id: string): Promise<boolean>;
//# sourceMappingURL=fileStorage.d.ts.map