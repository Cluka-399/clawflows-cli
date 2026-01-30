import { getRegistryUrl } from './config.mjs';

let indexCache = null;

export async function fetchIndex(options = {}) {
  if (indexCache && !options.refresh) {
    return indexCache;
  }
  
  const registryUrl = getRegistryUrl(options);
  const url = `${registryUrl}/index.json`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch registry: ${res.status} ${res.statusText}`);
    }
    indexCache = await res.json();
    return indexCache;
  } catch (err) {
    if (err.cause?.code === 'ENOTFOUND') {
      throw new Error(`Cannot reach registry at ${registryUrl}. Check your internet connection.`);
    }
    throw err;
  }
}

export async function fetchAutomation(name, options = {}) {
  const registryUrl = getRegistryUrl(options);
  const url = `${registryUrl}/automations/${name}/automation.yaml`;
  
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Automation "${name}" not found in registry.`);
    }
    throw new Error(`Failed to fetch automation: ${res.status} ${res.statusText}`);
  }
  
  return res.text();
}

export async function fetchMetadata(name, options = {}) {
  const registryUrl = getRegistryUrl(options);
  const url = `${registryUrl}/automations/${name}/metadata.json`;
  
  const res = await fetch(url);
  if (!res.ok) {
    return null; // Metadata is optional
  }
  
  return res.json();
}
