#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config/routes.json');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return { routes: [] };
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
}

function listRoutes() {
  const config = loadConfig();
  console.log('\nConfigured Routes:');
  console.log('==================');
  if (config.routes.length === 0) {
    console.log('No routes configured.');
  } else {
    config.routes.forEach((route, i) => {
      const status = route.enabled ? '✓' : '✗';
      console.log(`${i + 1}. [${status}] ${route.path} -> ${route.target} (${route.name})`);
    });
  }
  console.log('');
}

function addRoute(pathPrefix, target, name) {
  const config = loadConfig();
  
  // Check for duplicate path
  if (config.routes.some(r => r.path === pathPrefix)) {
    console.error(`Error: Route with path "${pathPrefix}" already exists.`);
    process.exit(1);
  }
  
  config.routes.push({
    path: pathPrefix,
    target: target,
    name: name,
    enabled: true
  });
  
  saveConfig(config);
  console.log(`Added route: ${pathPrefix} -> ${target} (${name})`);
}

function removeRoute(pathPrefix) {
  const config = loadConfig();
  const index = config.routes.findIndex(r => r.path === pathPrefix);
  
  if (index === -1) {
    console.error(`Error: Route with path "${pathPrefix}" not found.`);
    process.exit(1);
  }
  
  const removed = config.routes.splice(index, 1)[0];
  saveConfig(config);
  console.log(`Removed route: ${removed.path} (${removed.name})`);
}

function toggleRoute(pathPrefix) {
  const config = loadConfig();
  const route = config.routes.find(r => r.path === pathPrefix);
  
  if (!route) {
    console.error(`Error: Route with path "${pathPrefix}" not found.`);
    process.exit(1);
  }
  
  route.enabled = !route.enabled;
  saveConfig(config);
  console.log(`Route ${pathPrefix} is now ${route.enabled ? 'enabled' : 'disabled'}`);
}

function showHelp() {
  console.log(`
Pi Gateway Route Manager

Usage:
  npm run manage list                     - List all routes
  npm run manage add <path> <target> <name> - Add a new route
  npm run manage remove <path>            - Remove a route
  npm run manage toggle <path>            - Enable/disable a route

Examples:
  npm run manage add /blog http://localhost:3001 "My Blog"
  npm run manage add /api http://localhost:4000 "API Server"
  npm run manage remove /blog
  npm run manage toggle /api
`);
}

const [,, command, ...args] = process.argv;

switch (command) {
  case 'list':
    listRoutes();
    break;
  case 'add':
    if (args.length < 3) {
      console.error('Usage: npm run manage add <path> <target> <name>');
      process.exit(1);
    }
    addRoute(args[0], args[1], args.slice(2).join(' '));
    break;
  case 'remove':
    if (!args[0]) {
      console.error('Usage: npm run manage remove <path>');
      process.exit(1);
    }
    removeRoute(args[0]);
    break;
  case 'toggle':
    if (!args[0]) {
      console.error('Usage: npm run manage toggle <path>');
      process.exit(1);
    }
    toggleRoute(args[0]);
    break;
  default:
    showHelp();
}
