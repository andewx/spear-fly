/**
 * File storage service for JSON persistence
 * Handles reading/writing platform, scenario, and session data
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { ISAMSystem, IFighterPlatform, IScenario, ISession } from '../types/index.js';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const PLATFORMS_DIR = path.join(DATA_DIR, 'platforms');
const SCENARIOS_DIR = path.join(DATA_DIR, 'scenarios');
const SESSIONS_DIR = path.join(DATA_DIR, 'session');

/**
 * Ensure directory exists, create if not
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Initialize all data directories
 */
export async function initializeDataDirectories(): Promise<void> {
  await Promise.all([
    ensureDir(PLATFORMS_DIR),
    ensureDir(SCENARIOS_DIR),
    ensureDir(SESSIONS_DIR),
  ]);
}

// ============================================================================
// Generic File Operations
// ============================================================================

async function readJSON<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

async function writeJSON<T>(filePath: string, data: T): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function listJSONFiles(dirPath: string): Promise<string[]> {
  const files = await fs.readdir(dirPath);
  return files.filter(f => f.endsWith('.json'));
}

async function deleteFile(filePath: string): Promise<void> {
  await fs.unlink(filePath);
}

// ============================================================================
// Platform Operations
// ============================================================================

export async function saveSAMPlatform(platform: ISAMSystem): Promise<void> {
  const filePath = path.join(PLATFORMS_DIR, `sam_${platform.id}.json`);
  await writeJSON(filePath, platform);
}

export async function saveFighterPlatform(platform: IFighterPlatform): Promise<void> {
  const filePath = path.join(PLATFORMS_DIR, `fighter_${platform.id}.json`);
  await writeJSON(filePath, platform);
}

export async function loadSAMPlatform(id: string): Promise<ISAMSystem | null> {
  const filePath = path.join(PLATFORMS_DIR, `sam_${id}.json`);
  try {
    const data = await readJSON<any>(filePath);
    // Coerce string numbers to actual numbers
    return {
      id: data.id,
      name: data.name,
      nominalRange: Number(data.nominalRange),
      pulseModel: data.pulseModel,
      manualAcquisitionTime: Number(data.manualAcquisitionTime),
      autoAcquisitionTime: Number(data.autoAcquisitionTime),
      memr: Number(data.memr),
      missileVelocity: Number(data.missileVelocity),
      systemFrequency: Number(data.systemFrequency),
      missileTrackingFrequency: Number(data.missileTrackingFrequency),
    } as ISAMSystem;
  } catch {
    return null;
  }
}

export async function loadFighterPlatform(id: string): Promise<IFighterPlatform | null> {
  const filePath = path.join(PLATFORMS_DIR, `fighter_${id}.json`);
  try {
    const data = await readJSON<any>(filePath);
    // Coerce string numbers to actual numbers
    return {
      id: data.id,
      type: data.type,
      velocity: Number(data.velocity),
      rcs: {
        nose: Number(data.rcs.nose),
        tail: Number(data.rcs.tail),
        side: Number(data.rcs.side),
        top: Number(data.rcs.top ?? data.rcs.side),
        bottom: Number(data.rcs.bottom ?? data.rcs.side),
      },
      harmParams: {
        velocity: Number(data.harmParams.velocity),
        range: Number(data.harmParams.range),
        launchPreference: data.harmParams.launchPreference,
        memrRatio: data.harmParams.memrRatio ? Number(data.harmParams.memrRatio) : undefined,
      },
    } as IFighterPlatform;
  } catch {
    return null;
  }
}

export async function listAllPlatforms(): Promise<{ sams: ISAMSystem[]; fighters: IFighterPlatform[] }> {
  const files = await listJSONFiles(PLATFORMS_DIR);
  const sams: ISAMSystem[] = [];
  const fighters: IFighterPlatform[] = [];

  for (const file of files) {
    const filePath = path.join(PLATFORMS_DIR, file);
    if (file.startsWith('sam_')) {
      const sam = await readJSON<ISAMSystem>(filePath);
      sams.push(sam);
    } else if (file.startsWith('fighter_')) {
      const fighter = await readJSON<IFighterPlatform>(filePath);
      fighters.push(fighter);
    }
  }

  return { sams, fighters };
}

export async function deletePlatform(id: string, type: 'sam' | 'fighter'): Promise<boolean> {
  const prefix = type === 'sam' ? 'sam_' : 'fighter_';
  const filePath = path.join(PLATFORMS_DIR, `${prefix}${id}.json`);
  try {
    await deleteFile(filePath);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Scenario Operations
// ============================================================================

export async function saveScenario(scenario: IScenario): Promise<void> {
  const filePath = path.join(SCENARIOS_DIR, `${scenario.id}.json`);
  await writeJSON(filePath, scenario);
}

export async function loadScenario(id: string): Promise<IScenario | null> {
  const filePath = path.join(SCENARIOS_DIR, `${id}.json`);
  try {
    const data = await readJSON<any>(filePath);
    // Coerce string numbers to actual numbers
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      timeStep: Number(data.timeStep),
      grid: {
        width: Number(data.grid.width),
        height: Number(data.grid.height),
        resolution: Number(data.grid.resolution),
      },
      platforms: {
        sam: {
          configId: data.platforms.sam.configId,
          position: {
            x: Number(data.platforms.sam.position.x),
            y: Number(data.platforms.sam.position.y),
          },
          heading: Number(data.platforms.sam.heading),
        },
        fighter: {
          configId: data.platforms.fighter.configId,
          position: {
            x: Number(data.platforms.fighter.position.x),
            y: Number(data.platforms.fighter.position.y),
          },
          heading: Number(data.platforms.fighter.heading),
          flightPath: data.platforms.fighter.flightPath,
        },
      },
      environment: {
        precipitation: {
          enabled: Boolean(data.environment.precipitation.enabled),
          nominalRainRate: Number(data.environment.precipitation.nominalRainRate),
          nominalCellSize: Number(data.environment.precipitation.nominalCellSize),
          nominalCoverage: Number(data.environment.precipitation.nominalCoverage),
          alpha: Number(data.environment.precipitation.alpha),
          maxRainRateCap: Number(data.environment.precipitation.maxRainRateCap),
          sigmoidK: Number(data.environment.precipitation.sigmoidK),
          seed: data.environment.precipitation.seed ? Number(data.environment.precipitation.seed) : undefined,
        },
      },
      precipitationFieldImage: data.precipitationFieldImage,
    } as IScenario;
  } catch {
    return null;
  }
}

export async function listAllScenarios(): Promise<IScenario[]> {
  const files = await listJSONFiles(SCENARIOS_DIR);
  const scenarios: IScenario[] = [];

  for (const file of files) {
    const filePath = path.join(SCENARIOS_DIR, file);
    const scenario = await readJSON<IScenario>(filePath);
    scenarios.push(scenario);
  }

  return scenarios;
}

export async function deleteScenario(id: string): Promise<boolean> {
  const filePath = path.join(SCENARIOS_DIR, `${id}.json`);
  try {
    await deleteFile(filePath);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Session Operations
// ============================================================================

export async function saveSession(session: ISession): Promise<void> {
  const filePath = path.join(SESSIONS_DIR, `${session.id}.json`);
  await writeJSON(filePath, session);
}

export async function loadSession(id: string): Promise<ISession | null> {
  const filePath = path.join(SESSIONS_DIR, `${id}.json`);
  try {
    return await readJSON<ISession>(filePath);
  } catch {
    return null;
  }
}

export async function deleteSession(id: string): Promise<boolean> {
  const filePath = path.join(SESSIONS_DIR, `${id}.json`);
  try {
    await deleteFile(filePath);
    return true;
  } catch {
    return false;
  }
}
