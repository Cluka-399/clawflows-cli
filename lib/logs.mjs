import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getLogsDir } from './config.mjs';

export async function logs(name, options = {}) {
  if (!name) {
    console.log('Usage: clawflows logs <automation-name>');
    return;
  }

  const logsDir = getLogsDir(options);
  const automationLogsDir = join(logsDir, name);

  if (!existsSync(automationLogsDir)) {
    console.log(`No logs found for ${name}`);
    console.log('');
    console.log('Run the automation first: clawflows run ' + name);
    return;
  }

  const files = readdirSync(automationLogsDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse(); // Most recent first

  if (files.length === 0) {
    console.log(`No logs found for ${name}`);
    return;
  }

  const limit = parseInt(options.last) || 5;
  const toShow = files.slice(0, limit);

  console.log(`Recent runs for ${name} (showing ${toShow.length} of ${files.length}):\n`);

  for (const file of toShow) {
    const filePath = join(automationLogsDir, file);
    
    try {
      const log = JSON.parse(readFileSync(filePath, 'utf8'));
      
      console.log(`  ${log.startedAt}`);
      console.log(`    Steps: ${log.steps?.length || 0}`);
      
      if (log.dryRun) {
        console.log('    [DRY RUN]');
      }
      
      const completed = log.steps?.filter(s => !s.skipped && !s.dryRun).length || 0;
      const skipped = log.steps?.filter(s => s.skipped).length || 0;
      
      console.log(`    Completed: ${completed}, Skipped: ${skipped}`);
      
      if (log.completedAt) {
        const duration = new Date(log.completedAt) - new Date(log.startedAt);
        console.log(`    Duration: ${duration}ms`);
      }
      
      console.log('');
    } catch (err) {
      console.log(`  ${file}`);
      console.log(`    (Error reading log: ${err.message})`);
      console.log('');
    }
  }

  if (files.length > limit) {
    console.log(`Use --last ${files.length} to see all logs.`);
  }
}
