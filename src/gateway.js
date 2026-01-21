const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const CONFIG_PATH = path.join(__dirname, '../config/routes.json');

function loadRoutes() {
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading routes config:', err.message);
    return { routes: [] };
  }
}

function setupRoutes() {
  const config = loadRoutes();
  
  config.routes.forEach(route => {
    if (!route.enabled) return;
    
    console.log(`Registering route: ${route.path} -> ${route.target} (${route.name})`);
    
    app.use(route.path, createProxyMiddleware({
      target: route.target,
      changeOrigin: true,
      pathRewrite: {
        [`^${route.path}`]: ''
      },
      onError: (err, req, res) => {
        console.error(`Proxy error for ${route.name}:`, err.message);
        res.status(502).json({ 
          error: 'Bad Gateway', 
          message: `Unable to reach ${route.name}` 
        });
      }
    }));
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// List routes endpoint
app.get('/api/routes', (req, res) => {
  const config = loadRoutes();
  res.json(config.routes);
});

// Setup proxy routes
setupRoutes();

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'No route configured for this path',
    availableRoutes: '/api/routes'
  });
});

app.listen(PORT, () => {
  console.log(`Pi Gateway running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Routes API: http://localhost:${PORT}/api/routes`);
});

module.exports = app;
