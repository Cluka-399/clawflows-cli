#!/usr/bin/env node

import { search } from '../lib/search.mjs';
import { check } from '../lib/check.mjs';
import { install } from '../lib/install.mjs';
import { list } from '../lib/list.mjs';
import { run } from '../lib/run.mjs';
import { enable, disable } from '../lib/schedule.mjs';
import { logs } from '../lib/logs.mjs';
import { publish } from '../lib/publish.mjs';

const args = process.argv.slice(2);
const command = args[0];

const HELP = `
clawflows - Multi-skill automations for OpenClaw agents

Usage:
  clawflows <command> [options]

Commands:
  search <query>     Search the registry for automations
  check <name>       Check if you have required capabilities
  install <name>     Download and install an automation
  list               List installed automations
  run <name>         Run an automation
  enable <name>      Enable scheduled execution
  disable <name>     Disable scheduled execution
  logs <name>        View execution logs
  publish <path>     Show instructions for publishing

Options:
  --help, -h         Show this help
  --version, -v      Show version
  --dry-run          For 'run': show what would happen without executing
  --dir <path>       Custom automations directory (default: ./automations)
  --registry <url>   Custom registry URL

Examples:
  clawflows search "youtube competitor"
  clawflows check youtube-competitor-tracker
  clawflows install youtube-competitor-tracker
  clawflows run youtube-competitor-tracker --dry-run
  clawflows list

Registry: https://clawflows.com
`;

async function main() {
  if (!command || command === '--help' || command === '-h') {
    console.log(HELP);
    process.exit(0);
  }

  if (command === '--version' || command === '-v') {
    const pkg = await import('../package.json', { assert: { type: 'json' } });
    console.log(pkg.default.version);
    process.exit(0);
  }

  const options = parseOptions(args.slice(1));

  try {
    switch (command) {
      case 'search':
        await search(options._.join(' '), options);
        break;
      
      case 'check':
        await check(options._[0], options);
        break;
      
      case 'install':
        await install(options._[0], options);
        break;
      
      case 'list':
        await list(options);
        break;
      
      case 'run':
        await run(options._[0], options);
        break;
      
      case 'enable':
        await enable(options._[0], options);
        break;
      
      case 'disable':
        await disable(options._[0], options);
        break;
      
      case 'logs':
        await logs(options._[0], options);
        break;
      
      case 'publish':
        await publish(options._[0], options);
        break;
      
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Run "clawflows --help" for usage.');
        process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    if (options.debug) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

function parseOptions(args) {
  const options = { _: [] };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      
      if (next && !next.startsWith('-')) {
        options[key] = next;
        i++;
      } else {
        options[key] = true;
      }
    } else if (arg.startsWith('-')) {
      options[arg.slice(1)] = true;
    } else {
      options._.push(arg);
    }
  }
  
  return options;
}

main();
