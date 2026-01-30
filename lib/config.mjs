import { homedir } from 'os';
import { join } from 'path';

export const DEFAULT_REGISTRY = 'https://clawflows.com';

export function getAutomationsDir(options = {}) {
  if (options.dir) return options.dir;
  if (process.env.CLAWFLOWS_DIR) return process.env.CLAWFLOWS_DIR;
  
  // Try common Clawdbot workspace locations
  const candidates = [
    join(process.cwd(), 'automations'),
    '/data/automations',
    '/data/clawd/automations',
    join(homedir(), 'automations'),
  ];
  
  return candidates[0]; // Default to cwd/automations
}

export function getSkillsDirs(options = {}) {
  // Look for skills in multiple locations
  const dirs = [];
  
  if (process.env.CLAWFLOWS_SKILLS) {
    dirs.push(...process.env.CLAWFLOWS_SKILLS.split(':'));
  }
  
  dirs.push(
    join(process.cwd(), 'skills'),
    '/data/skills',
    '/data/clawd/skills',
    '/app/skills',
  );
  
  return dirs;
}

export function getRegistryUrl(options = {}) {
  if (options.registry) return options.registry;
  if (process.env.CLAWFLOWS_REGISTRY) return process.env.CLAWFLOWS_REGISTRY;
  return DEFAULT_REGISTRY;
}

export function getLogsDir(options = {}) {
  const automationsDir = getAutomationsDir(options);
  return join(automationsDir, '.logs');
}
