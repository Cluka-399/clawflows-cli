import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getAutomationsDir } from './config.mjs';
import YAML from 'yaml';

export async function enable(name, options = {}) {
  if (!name) {
    console.log('Usage: clawflows enable <automation-name>');
    return;
  }

  const automationsDir = getAutomationsDir(options);
  const filePath = join(automationsDir, `${name}.yaml`);

  if (!existsSync(filePath)) {
    console.error(`Automation not found: ${filePath}`);
    process.exit(1);
  }

  const content = readFileSync(filePath, 'utf8');
  const automation = YAML.parse(content);

  if (!automation.trigger?.schedule) {
    console.log(`${name} doesn't have a schedule defined.`);
    console.log('Add a trigger.schedule to the automation YAML to enable scheduling.');
    return;
  }

  const schedule = automation.trigger.schedule;

  console.log(`To enable scheduled execution for ${name}:`);
  console.log('');
  console.log('Add this to your OpenClaw cron configuration:');
  console.log('');
  console.log('```yaml');
  console.log('cron:');
  console.log('  jobs:');
  console.log(`    - name: "clawflows-${name}"`);
  console.log(`      schedule: "${schedule}"`);
  console.log('      payload:');
  console.log('        kind: systemEvent');
  console.log(`        text: "Run clawflows automation: clawflows run ${name}"`);
  console.log('```');
  console.log('');
  console.log('Or use the OpenClaw cron tool:');
  console.log('');
  console.log('```');
  console.log(`cron add --name "clawflows-${name}" --schedule "${schedule}" --text "Run clawflows automation: clawflows run ${name}"`);
  console.log('```');
}

export async function disable(name, options = {}) {
  if (!name) {
    console.log('Usage: clawflows disable <automation-name>');
    return;
  }

  console.log(`To disable scheduled execution for ${name}:`);
  console.log('');
  console.log('Remove the cron job from your OpenClaw configuration,');
  console.log('or use the OpenClaw cron tool:');
  console.log('');
  console.log('```');
  console.log(`cron remove --name "clawflows-${name}"`);
  console.log('```');
}
