import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { getAutomationsDir, getLogsDir } from './config.mjs';
import { scanCapabilities } from './check.mjs';
import YAML from 'yaml';

export async function run(name, options = {}) {
  if (!name) {
    console.log('Usage: clawflows run <automation-name>');
    return;
  }

  const automationsDir = getAutomationsDir(options);
  
  // Support both name and direct path
  let filePath;
  if (name.endsWith('.yaml') || name.endsWith('.yml')) {
    filePath = name;
  } else {
    filePath = join(automationsDir, `${name}.yaml`);
    if (!existsSync(filePath)) {
      filePath = join(automationsDir, `${name}.yml`);
    }
  }

  if (!existsSync(filePath)) {
    console.error(`Automation not found: ${filePath}`);
    console.log('');
    console.log('Install from registry: clawflows install <name>');
    console.log('Or list installed: clawflows list');
    process.exit(1);
  }

  // Parse automation
  const content = readFileSync(filePath, 'utf8');
  const automation = YAML.parse(content);

  console.log(`Running: ${automation.name || name}`);
  if (automation.description) {
    console.log(`  ${automation.description}`);
  }
  console.log('');

  // Scan capabilities
  const capabilities = scanCapabilities(options);

  // Check all requirements are met
  const required = automation.requires || [];
  for (const req of required) {
    const cap = typeof req === 'string' ? req : req.capability;
    if (!capabilities[cap]) {
      console.error(`Missing capability: ${cap}`);
      console.log('Install a skill that provides this capability first.');
      process.exit(1);
    }
  }

  // Initialize context with config
  const context = {
    config: extractConfigDefaults(automation.config || {}),
  };

  const steps = automation.steps || [];
  const runLog = {
    automation: automation.name || name,
    startedAt: new Date().toISOString(),
    steps: [],
    dryRun: options['dry-run'] || false,
  };

  // Execute steps
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepName = step.name || `step-${i + 1}`;
    
    console.log(`[${i + 1}/${steps.length}] ${stepName}`);

    // Check condition
    if (step.condition) {
      const conditionMet = evaluateCondition(step.condition, context);
      
      if (!conditionMet) {
        console.log(`  Condition not met: ${step.condition}`);
        
        if (step.onFalse === 'exit') {
          console.log('  Exiting automation.');
          runLog.steps.push({ name: stepName, skipped: true, reason: 'condition not met, exit' });
          break;
        }
        
        if (step.onFalse?.startsWith('skip-to:')) {
          const targetStep = step.onFalse.slice(8);
          const targetIndex = steps.findIndex(s => s.name === targetStep);
          if (targetIndex > i) {
            console.log(`  Skipping to: ${targetStep}`);
            i = targetIndex - 1; // -1 because loop will increment
            runLog.steps.push({ name: stepName, skipped: true, reason: `skip-to ${targetStep}` });
            continue;
          }
        }
        
        runLog.steps.push({ name: stepName, skipped: true, reason: 'condition not met' });
        continue;
      }
    }

    // Handle capability call
    if (step.capability) {
      const provider = capabilities[step.capability];
      
      if (!provider) {
        console.error(`  No provider for capability: ${step.capability}`);
        process.exit(1);
      }

      const args = interpolate(step.args || {}, context);
      
      console.log(`  Capability: ${step.capability}.${step.method}`);
      console.log(`  Provider: ${provider.skill}`);
      
      if (options['dry-run']) {
        console.log(`  Args: ${JSON.stringify(args, null, 2)}`);
        console.log('  [DRY RUN - not executing]');
        runLog.steps.push({ name: stepName, capability: step.capability, method: step.method, args, dryRun: true });
      } else {
        // Read CAPABILITY.md and show instructions
        const capMdPath = join(provider.path, provider.skill, 'CAPABILITY.md');
        
        if (existsSync(capMdPath)) {
          const capMd = readFileSync(capMdPath, 'utf8');
          const instructions = extractMethodInstructions(capMd, step.method);
          
          console.log('');
          console.log('  📋 Execute these instructions:');
          console.log('  ─────────────────────────────');
          console.log(instructions.split('\n').map(l => '  ' + l).join('\n'));
          console.log('  ─────────────────────────────');
          console.log('');
          console.log('  With args:', JSON.stringify(args, null, 2));
        } else {
          console.log(`  ⚠️  No CAPABILITY.md found for ${provider.skill}`);
          console.log(`     The agent should use the ${provider.skill} skill to fulfill:`);
          console.log(`     ${step.capability}.${step.method}(${JSON.stringify(args)})`);
        }
        
        // In a real implementation, the agent would execute and capture output
        // For now, we just log what needs to happen
        if (step.capture) {
          console.log(`  → Capture result as: ${step.capture}`);
          context[step.capture] = { _placeholder: `Result of ${step.capability}.${step.method}` };
        }
        
        runLog.steps.push({ name: stepName, capability: step.capability, method: step.method, args });
      }
    }

    // Handle action
    if (step.action) {
      console.log(`  Action: ${step.action}`);
      
      if (step.action === 'notify') {
        const message = interpolate(step.message || '', context);
        if (options['dry-run']) {
          console.log(`  Message: ${message}`);
          console.log('  [DRY RUN - not sending]');
        } else {
          console.log(`  Message: ${message}`);
          if (step.attachments) {
            console.log(`  Attachments: ${JSON.stringify(interpolate(step.attachments, context))}`);
          }
          console.log('  → Send via configured notification channel');
        }
        runLog.steps.push({ name: stepName, action: step.action, message });
      }
      
      if (step.action === 'template') {
        const template = step.template || '';
        const result = interpolate(template, context);
        console.log(`  Template rendered (${result.length} chars)`);
        if (step.capture) {
          context[step.capture] = result;
          console.log(`  → Captured as: ${step.capture}`);
        }
        runLog.steps.push({ name: stepName, action: step.action, outputLength: result.length });
      }
      
      if (step.action === 'evaluate') {
        const expression = step.expression || '';
        try {
          // Handle multi-line expressions with const/let/var by wrapping in IIFE
          const isMultiLine = expression.includes('\n') || /^\s*(const|let|var)\s/.test(expression);
          const code = isMultiLine 
            ? `return (function() { ${expression} })()` 
            : `return ${expression}`;
          const fn = new Function(...Object.keys(context), code);
          const result = fn(...Object.values(context));
          console.log(`  Evaluated: ${JSON.stringify(result)}`);
          if (step.capture) {
            context[step.capture] = result;
            console.log(`  → Captured as: ${step.capture}`);
          }
          runLog.steps.push({ name: stepName, action: step.action, result });
        } catch (err) {
          console.error(`  Error evaluating: ${err.message}`);
          runLog.steps.push({ name: stepName, action: step.action, error: err.message });
        }
      }
    }

    console.log('');
  }

  runLog.completedAt = new Date().toISOString();

  // Save log
  if (!options['dry-run']) {
    saveLog(name, runLog, options);
  }

  console.log('Done!');
}

function extractConfigDefaults(config) {
  const defaults = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'object' && 'default' in value) {
      defaults[key] = value.default;
    } else {
      defaults[key] = value;
    }
  }
  return defaults;
}

function evaluateCondition(condition, context) {
  try {
    // Create a function that has access to context variables
    const fn = new Function(...Object.keys(context), `return ${condition}`);
    return fn(...Object.values(context));
  } catch (err) {
    console.error(`Error evaluating condition "${condition}": ${err.message}`);
    return false;
  }
}

function interpolate(template, context) {
  if (typeof template === 'string') {
    return template.replace(/\$\{([^}]+)\}/g, (match, path) => {
      try {
        const fn = new Function(...Object.keys(context), `return ${path}`);
        const result = fn(...Object.values(context));
        return typeof result === 'object' ? JSON.stringify(result) : result;
      } catch (err) {
        return match; // Keep original if can't resolve
      }
    });
  }
  
  if (Array.isArray(template)) {
    return template.map(item => interpolate(item, context));
  }
  
  if (typeof template === 'object' && template !== null) {
    const result = {};
    for (const [key, value] of Object.entries(template)) {
      result[key] = interpolate(value, context);
    }
    return result;
  }
  
  return template;
}

function extractMethodInstructions(capabilityMd, methodName) {
  // Find the method section
  const methodRegex = new RegExp(`###\\s*${methodName}[\\s\\S]*?(?=###|$)`, 'i');
  const match = capabilityMd.match(methodRegex);
  
  if (!match) {
    return `Method ${methodName} not found in CAPABILITY.md`;
  }
  
  // Extract "How to fulfill" section
  const howToMatch = match[0].match(/\*\*How to fulfill:\*\*\s*([\s\S]*?)(?=\*\*|$)/i);
  if (howToMatch) {
    return howToMatch[1].trim();
  }
  
  return match[0].trim();
}

function saveLog(name, log, options) {
  const logsDir = getLogsDir(options);
  const automationLogsDir = join(logsDir, name);
  
  mkdirSync(automationLogsDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = join(automationLogsDir, `${timestamp}.json`);
  
  writeFileSync(logPath, JSON.stringify(log, null, 2));
}
