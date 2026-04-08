import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fetchAutomation, fetchMetadata } from './registry.mjs';
import { getAutomationsDir } from './config.mjs';
import { check, scanCapabilities } from './check.mjs';

export async function install(name, options = {}) {
  if (!name) {
    console.log('Usage: clawflows install <automation-name>');
    return;
  }

  const automationsDir = getAutomationsDir(options);
  const targetPath = join(automationsDir, `${name}.yaml`);

  // Check if already installed
  if (existsSync(targetPath) && !options.force) {
    console.log(`${name} is already installed at ${targetPath}`);
    console.log('Use --force to overwrite.');
    return;
  }

  // Fetch metadata (optional — may not exist for all automations)
  console.log(`Fetching ${name}...`);
  const metadata = await fetchMetadata(name, options);

  // Check capabilities if metadata available
  const required = Array.isArray(metadata?.requires) ? metadata.requires : [];
  const installed = scanCapabilities(options).capabilities;
  const missing = required.filter(r => {
    const cap = typeof r === 'string' ? r : r.capability;
    return !installed[cap];
  });

  if (missing.length > 0 && !options['skip-check']) {
    console.log('');
    console.log('⚠️  Missing capabilities:');
    for (const cap of missing) {
      console.log(`   - ${cap}`);
    }
    console.log('');
    console.log('Install required skills from ClawdHub first, or use --skip-check to install anyway.');
    process.exit(1);
  }

  // Fetch automation YAML
  const yaml = await fetchAutomation(name, options);

  // Ensure directory exists
  mkdirSync(automationsDir, { recursive: true });

  // Write file
  writeFileSync(targetPath, yaml);

  console.log(`✅ Installed ${name}`);
  console.log(`   Location: ${targetPath}`);
  
  if (metadata?.schedule) {
    console.log(`   Schedule: ${metadata.schedule}`);
    console.log('');
    console.log('Enable scheduled execution with:');
    console.log(`   clawflows enable ${name}`);
  }
  
  console.log('');
  console.log('Run now with:');
  console.log(`   clawflows run ${name}`);
}
