import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { fetchMetadata } from './registry.mjs';
import { getSkillsDirs } from './config.mjs';

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
  const installedCapabilities = scanCapabilities(options);
  
  let allSatisfied = true;
  
  for (const capability of required) {
    const provider = installedCapabilities[capability];
    
    if (provider) {
      console.log(`  ✅ ${capability}`);
      console.log(`     Provided by: ${provider.skill}`);
    } else {
      console.log(`  ❌ ${capability}`);
      console.log(`     Not installed. Find a skill that provides this on ClawdHub.`);
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
  const capabilities = {};
  const skillsDirs = getSkillsDirs(options);
  
  for (const skillsDir of skillsDirs) {
    if (!existsSync(skillsDir)) continue;
    
    try {
      const skills = readdirSync(skillsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
      
      for (const skill of skills) {
        const capabilityMdPath = join(skillsDir, skill, 'CAPABILITY.md');
        const skillMdPath = join(skillsDir, skill, 'SKILL.md');
        
        // Check CAPABILITY.md first
        if (existsSync(capabilityMdPath)) {
          const content = readFileSync(capabilityMdPath, 'utf8');
          const provides = parseProvides(content);
          
          for (const cap of provides) {
            if (!capabilities[cap]) {
              capabilities[cap] = { skill, path: skillsDir };
            }
          }
        }
        
        // Also check SKILL.md frontmatter
        if (existsSync(skillMdPath)) {
          const content = readFileSync(skillMdPath, 'utf8');
          const provides = parseFrontmatterProvides(content);
          
          for (const cap of provides) {
            if (!capabilities[cap]) {
              capabilities[cap] = { skill, path: skillsDir };
            }
          }
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }
  
  return capabilities;
}

function parseProvides(content) {
  // Look for "Provides: capability-name" in CAPABILITY.md
  const match = content.match(/^Provides:\s*(.+)$/m);
  if (match) {
    return match[1].split(',').map(s => s.trim());
  }
  return [];
}

function parseFrontmatterProvides(content) {
  // Look for provides: in YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return [];
  
  const frontmatter = frontmatterMatch[1];
  const provides = [];
  
  // Simple regex for provides entries
  const providesMatch = frontmatter.match(/provides:\s*\n((?:\s+-[^\n]+\n?)*)/);
  if (providesMatch) {
    const lines = providesMatch[1].split('\n');
    for (const line of lines) {
      const capMatch = line.match(/capability:\s*(\S+)/);
      if (capMatch) {
        provides.push(capMatch[1]);
      }
    }
  }
  
  return provides;
}
