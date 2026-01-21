const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const CONFIG_PATH = path.join(__dirname, '../config/routes.json');

// Parse CLI args for credentials
const args = process.argv.slice(2);
let adminUser = 'admin';
let adminPass = 'password';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--user' && args[i + 1]) {
    adminUser = args[i + 1];
    i++;
  } else if (args[i] === '--password' && args[i + 1]) {
    adminPass = args[i + 1];
    i++;
  }
}

console.log(`Admin credentials configured for user: ${adminUser}`);

// State
let routes = [];

function loadRoutes() {
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf8');
    const config = JSON.parse(data);
    routes = config.routes || [];
  } catch (err) {
    console.error('Error loading routes config:', err.message);
    routes = [];
  }
}

function saveRoutes() {
  try {
    const config = { routes };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
  } catch (err) {
    console.error('Error saving routes config:', err.message);
  }
}

// Initial load
loadRoutes();

// Auth Middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  const user = auth[0];
  const pass = auth[1];

  if (user === adminUser && pass === adminPass) {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden' });
  }
};

// Health check endpoint (public)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Router (Authenticated & JSON Parsed)
const apiRouter = express.Router();
apiRouter.use(express.json());
apiRouter.use(authenticate);

// Login check (for UI to verify creds)
apiRouter.post('/login', (req, res) => {
  res.json({ status: 'ok', user: adminUser });
});

// Routes Management API
apiRouter.get('/routes', (req, res) => {
  res.json(routes);
});

apiRouter.post('/routes', (req, res) => {
  const { path: routePath, target, name } = req.body;
  
  if (!routePath || !target || !name) {
    return res.status(400).json({ error: 'Missing required fields: path, target, name' });
  }

  if (routes.some(r => r.path === routePath)) {
    return res.status(409).json({ error: 'Route already exists' });
  }

  const newRoute = {
    path: routePath,
    target,
    name,
    enabled: true
  };

  routes.push(newRoute);
  saveRoutes();
  res.status(201).json(newRoute);
});

apiRouter.delete('/routes', (req, res) => {
  const { path: routePath } = req.body; // Using body for delete to avoid encoding issues in URL
  const index = routes.findIndex(r => r.path === routePath);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Route not found' });
  }

  const removed = routes.splice(index, 1)[0];
  saveRoutes();
  res.json(removed);
});

apiRouter.patch('/routes', (req, res) => {
  const { path: routePath, enabled } = req.body;
  const route = routes.find(r => r.path === routePath);

  if (!route) {
    return res.status(404).json({ error: 'Route not found' });
  }

  if (typeof enabled === 'boolean') {
    route.enabled = enabled;
  }

  saveRoutes();
  res.json(route);
});

// Mount API Router
app.use('/management/api', apiRouter);

// Static frontend hosting
// Serve static files from the client build directory
const CLIENT_BUILD_PATH = path.join(__dirname, '../client/dist');
app.use('/management', express.static(CLIENT_BUILD_PATH));

// Serve index.html for any /management/* request to support client-side routing
app.use('/management', (req, res) => {
  if (fs.existsSync(path.join(CLIENT_BUILD_PATH, 'index.html'))) {
    res.sendFile(path.join(CLIENT_BUILD_PATH, 'index.html'));
  } else {
    res.status(404).send('Management UI not built yet.');
  }
});


// Dynamic Proxy Logic
const proxy = createProxyMiddleware({
  target: 'http://localhost', // Default, will be overridden by router
  changeOrigin: true,
  router: (req) => {
    // Find the matching route
    const route = routes.find(r => r.enabled && req.path.startsWith(r.path));
    return route ? route.target : undefined;
  },
  pathRewrite: (path, req) => {
    const route = routes.find(r => r.enabled && path.startsWith(r.path));
    if (route) {
      return path.replace(new RegExp(`^${route.path}`), '');
    }
    return path;
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(502).json({ error: 'Bad Gateway', message: err.message });
  }
});

// Proxy handler
app.use((req, res, next) => {
  // Skip API and Management routes
  if (req.path.startsWith('/management')) {
    return next();
  }

  // Check if request matches a configured route
  const route = routes.find(r => r.enabled && req.path.startsWith(r.path));
  if (route) {
    return proxy(req, res, next);
  }

  // Fallback for no route matched
  res.status(404).json({ 
    error: 'Not Found',
    message: 'No route configured for this path',
    availableRoutes: '/management/api/routes'
  });
});

app.listen(PORT, () => {
  console.log(`Pi Gateway running on port ${PORT}`);
  console.log(`Management UI: http://localhost:${PORT}/management`);
  console.log(`Routes API: http://localhost:${PORT}/management/api/routes`);
});

module.exports = app;