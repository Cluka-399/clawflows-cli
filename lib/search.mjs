import { fetchIndex } from './registry.mjs';

export async function search(query, options = {}) {
  if (!query) {
    console.log('Usage: clawflows search <query>');
    console.log('');
    console.log('Examples:');
    console.log('  clawflows search "youtube"');
    console.log('  clawflows search "competitor analysis"');
    console.log('  clawflows search --capability chart-generation');
    return;
  }

  const index = await fetchIndex(options);
  const queryLower = query.toLowerCase();
  
  // Filter automations
  let results = index.automations.filter(a => {
    // Search by capability
    if (options.capability) {
      return a.requires?.includes(options.capability);
    }
    
    // Search by tag
    if (options.tag) {
      return a.tags?.includes(options.tag);
    }
    
    // Full text search
    return (
      a.name.toLowerCase().includes(queryLower) ||
      a.description?.toLowerCase().includes(queryLower) ||
      a.tags?.some(t => t.toLowerCase().includes(queryLower)) ||
      a.requires?.some(r => r.toLowerCase().includes(queryLower))
    );
  });

  if (results.length === 0) {
    console.log(`No automations found for "${query}"`);
    console.log('');
    console.log('Try:');
    console.log('  - A different search term');
    console.log('  - Browse all at https://clawflows.com');
    return;
  }

  console.log(`Found ${results.length} automation${results.length === 1 ? '' : 's'}:\n`);
  
  for (const automation of results) {
    console.log(`  ${automation.name}`);
    console.log(`    ${automation.description || 'No description'}`);
    console.log(`    Requires: ${automation.requires?.join(', ') || 'none'}`);
    if (automation.tags?.length) {
      console.log(`    Tags: ${automation.tags.join(', ')}`);
    }
    console.log('');
  }
  
  console.log('Install with: clawflows install <name>');
}
