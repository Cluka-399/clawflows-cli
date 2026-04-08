import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import { fetchMetadata } from './registry.mjs';
import { getSkillsDirs } from './config.mjs';

const BUILTIN_CAPABILITIES = {
  llm: { skill: 'lobster-runtime', path: '__runtime__', builtIn: true },
  database: { skill: 'lobster-runtime', path: '__runtime__', builtIn: true },
};

export async function check(name, options = {}) {
  if (!name) {
    console.log('Usage: clawflows check <automation-name>');
    return;
  }

  // Fetch automation metadata to get requirements
  const metadata = await fetchMetadata(name, options);
  
  if (!metadata) {
    console.error(`Automation "${name}" not found in registry.`);
    process.exit(1);
  }

  const required = metadata.requires || [];
  
  if (required.length === 0) {
    console.log(`${name} has no capability requirements.`);
    console.log('Ready to install: clawflows install ' + name);
    return;
  }

  console.log(`${name} requires:\n`);

  // Scan installed skills for capabilities
  const scan = scanCapabilities(options);
  const installedCapabilities = scan.capabilities;
  
  let allSatisfied = true;
  
  for (const capability of required) {
    const provider = installedCapabilities[capability];
    
    if (provider) {
      console.log(`  ✅ ${capability}`);
      console.log(`     Provided by: ${provider.skill}${provider.builtIn ? ' (built-in runtime capability)' : provider.alias ? ' (installed skill alias)' : ''}`);
    } else {
      console.log(`  ❌ ${capability}`);
      const likelySkills = findLikelySkills(capability, scan.skills);
      if (likelySkills.length > 0) {
        console.log(`     No explicit capability provider found, but likely related installed skill(s): ${likelySkills.map(s => s.skill).join(', ')}`);
        console.log('     Fix by adding CAPABILITY.md or SKILL.md frontmatter `provides:` entries to that skill.');
      } else {
        console.log(`     Not installed. Find a skill that provides this on ClawdHub.`);
      }
      allSatisfied = false;
    }
    console.log('');
  }

  if (allSatisfied) {
    console.log('All requirements satisfied!');
    console.log(`Install with: clawflows install ${name}`);
  } else {
    console.log('Missing capabilities. Install the required skills from ClawdHub first:');
    console.log('  clawdhub search <capability-name>');
  }
}

export function scanCapabilities(options = {}) {
  const capabilities = { ...BUILTIN_CAPABILITIES };
  const skills = [];
  const skillsDirs = getSkillsDirs(options);
  
  for (const skillsDir of skillsDirs) {
    if (!existsSync(skillsDir)) continue;
    
    try {
      const dirEntries = readdirSync(skillsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
      
      for (const skill of dirEntries) {
        const capabilityMdPath = join(skillsDir, skill, 'CAPABILITY.md');
        const skillMdPath = join(skillsDir, skill, 'SKILL.md');
        const skillInfo = {
          skill,
          path: skillsDir,
          tags: [],
          description: '',
          provides: [],
        };
        
        // Check CAPABILITY.md first
        if (existsSync(capabilityMdPath)) {
          const content = readFileSync(capabilityMdPath, 'utf8');
          const provides = parseProvides(content);
          skillInfo.provides.push(...provides);
          
          for (const cap of provides) {
            if (!capabilities[cap]) {
              capabilities[cap] = { skill, path: skillsDir };
            }
          }
        }
        
        // Also check SKILL.md frontmatter + descriptive metadata
        if (existsSync(skillMdPath)) {
          const content = readFileSync(skillMdPath, 'utf8');
          const frontmatter = parseFrontmatter(content);
          const provides = parseFrontmatterProvides(content);
          skillInfo.provides.push(...provides);
          skillInfo.tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
          skillInfo.description = frontmatter.description || '';
          
          for (const cap of provides) {
            if (!capabilities[cap]) {
              capabilities[cap] = { skill, path: skillsDir };
            }
          }
        }

        if (!capabilities[skill]) {
          capabilities[skill] = { skill, path: skillsDir, alias: true };
        }

        skills.push(skillInfo);
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }
  
  return { capabilities, skills };
}

function parseProvides(content) {
  // Look for "Provides: capability-name" in CAPABILITY.md
  const match = content.match(/^Provides:\s*(.+)$/m);
  if (match) {
    return match[1].split(',').map(s => s.trim());
  }
  return [];
}

function parseFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return {};

  try {
    return YAML.parse(frontmatterMatch[1]) || {};
  } catch {
    return {};
  }
}

function parseFrontmatterProvides(content) {
  const frontmatter = parseFrontmatter(content);
  const provides = Array.isArray(frontmatter.provides) ? frontmatter.provides : [];

  return provides
    .map(item => typeof item === 'string' ? item : item?.capability)
    .filter(Boolean);
}

function findLikelySkills(capability, skills) {
  const needle = String(capability || '').toLowerCase();
  return skills.filter(skill => {
    const haystack = [
      skill.skill,
      skill.description,
      ...(skill.tags || []),
      ...(skill.provides || []),
    ].join(' ').toLowerCase();

    return haystack.includes(needle);
  });
}
