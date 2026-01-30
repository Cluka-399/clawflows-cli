import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getAutomationsDir } from './config.mjs';
import YAML from 'yaml';

export async function list(options = {}) {
  const automationsDir = getAutomationsDir(options);
  
  if (!existsSync(automationsDir)) {
    console.log('No automations installed.');
    console.log(`Directory: ${automationsDir}`);
    console.log('');
    console.log('Install one with: clawflows install <name>');
    return;
  }

  const files = readdirSync(automationsDir)
    .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

  if (files.length === 0) {
    console.log('No automations installed.');
    console.log('');
    console.log('Install one with: clawflows install <name>');
    return;
  }

  console.log(`Installed automations (${automationsDir}):\n`);

  for (const file of files) {
    const name = file.replace(/\.ya?ml$/, '');
    const filePath = join(automationsDir, file);
    
    try {
      const content = readFileSync(filePath, 'utf8');
      const automation = YAML.parse(content);
      
      console.log(`  ${name}`);
      if (automation.description) {
        console.log(`    ${automation.description}`);
      }
      if (automation.trigger?.schedule) {
        console.log(`    Schedule: ${automation.trigger.schedule}`);
      }
      if (automation.requires?.length) {
        console.log(`    Requires: ${automation.requires.map(r => r.capability || r).join(', ')}`);
      }
      console.log('');
    } catch (err) {
      console.log(`  ${name}`);
      console.log(`    (Error reading: ${err.message})`);
      console.log('');
    }
  }

  console.log('Run with: clawflows run <name>');
}
