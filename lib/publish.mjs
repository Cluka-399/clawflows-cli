import { existsSync, readFileSync } from 'fs';
import { basename } from 'path';
import YAML from 'yaml';

export async function publish(path, options = {}) {
  if (!path) {
    console.log('Usage: clawflows publish <path-to-automation>');
    console.log('');
    console.log('Example: clawflows publish ./my-automation.yaml');
    return;
  }

  // Check file exists
  if (!existsSync(path)) {
    console.error(`File not found: ${path}`);
    process.exit(1);
  }

  // Parse to validate and extract info
  let automation;
  try {
    const content = readFileSync(path, 'utf8');
    automation = YAML.parse(content);
  } catch (err) {
    console.error(`Error parsing ${path}: ${err.message}`);
    process.exit(1);
  }

  const name = automation.name || basename(path, '.yaml').replace('.yml', '');
  const requires = automation.requires?.map(r => typeof r === 'string' ? r : r.capability) || [];

  console.log(`📦 Publishing: ${name}`);
  console.log('');
  console.log('To publish your automation to ClawFlows:');
  console.log('');
  console.log('1. Fork the registry:');
  console.log('   https://github.com/Cluka-399/clawflows-registry');
  console.log('');
  console.log('2. Create your automation folder:');
  console.log(`   /automations/${name}/`);
  console.log(`     ├── automation.yaml    (your workflow)`);
  console.log(`     ├── metadata.json      (see template below)`);
  console.log(`     └── README.md          (documentation)`);
  console.log('');
  console.log('3. Submit a Pull Request');
  console.log('');
  console.log('4. Once merged, your automation will be available at:');
  console.log(`   https://clawflows.com/automations/${name}/`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('📄 metadata.json template:');
  console.log('');
  
  const metadata = {
    name,
    description: automation.description || 'Description of your automation',
    author: automation.author || 'your-github-username',
    version: automation.version || '1.0.0',
    requires,
    trigger: automation.trigger?.schedule ? 'schedule' : 'manual',
  };
  
  if (automation.trigger?.schedule) {
    metadata.schedule = automation.trigger.schedule;
  }
  
  metadata.tags = ['tag1', 'tag2'];
  
  console.log(JSON.stringify(metadata, null, 2));
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('📚 Full guide: https://clawflows.com/docs/publishing');
}
