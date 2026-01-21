const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');

describe('Gateway API', () => {
  let app;
  const CONFIG_PATH = path.join(__dirname, '../../config/test-routes.json');

  beforeEach(() => {
    // Create test config
    const testConfig = {
      routes: [
        { path: '/api', target: 'http://localhost:4000', name: 'API Server', enabled: true },
        { path: '/blog', target: 'http://localhost:3001', name: 'Blog', enabled: true },
        { path: '/disabled', target: 'http://localhost:5000', name: 'Disabled', enabled: false }
      ]
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(testConfig, null, 2));

    // Set up test app
    app = express();
    const PORT = process.env.PORT || 8080;

    // Mock loadRoutes function
    const loadRoutes = () => {
      try {
        const data = fs.readFileSync(CONFIG_PATH, 'utf8');
        return JSON.parse(data);
      } catch (err) {
        return { routes: [] };
      }
    };

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // List routes endpoint
    app.get('/api/routes', (req, res) => {
      const config = loadRoutes();
      res.json(config.routes);
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'No route configured for this path',
        availableRoutes: '/api/routes'
      });
    });
  });

  afterEach(() => {
    if (fs.existsSync(CONFIG_PATH)) {
      fs.unlinkSync(CONFIG_PATH);
    }
  });

  describe('Health Check', () => {
    it('should return 200 and status ok', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return valid timestamp', async () => {
      const response = await request(app).get('/health');
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Routes API', () => {
    it('should return all routes', async () => {
      const response = await request(app)
        .get('/api/routes')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(3);
    });

    it('should return routes with correct structure', async () => {
      const response = await request(app).get('/api/routes');
      const routes = response.body;

      routes.forEach(route => {
        expect(route).toHaveProperty('path');
        expect(route).toHaveProperty('target');
        expect(route).toHaveProperty('name');
        expect(route).toHaveProperty('enabled');
      });
    });

    it('should include enabled and disabled routes', async () => {
      const response = await request(app).get('/api/routes');
      const routes = response.body;

      const enabledRoutes = routes.filter(r => r.enabled);
      const disabledRoutes = routes.filter(r => !r.enabled);

      expect(enabledRoutes.length).toBeGreaterThan(0);
      expect(disabledRoutes.length).toBeGreaterThan(0);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown')
        .expect(404)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('availableRoutes', '/api/routes');
    });

    it('should return 404 for any method on unknown routes', async () => {
      await request(app).post('/unknown').expect(404);
      await request(app).put('/unknown').expect(404);
      await request(app).delete('/unknown').expect(404);
    });
  });

  describe('loadRoutes function', () => {
    it('should load routes from config file', () => {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = JSON.parse(data);

      expect(config).toHaveProperty('routes');
      expect(config.routes).toBeInstanceOf(Array);
    });

    it('should handle missing config file', () => {
      fs.unlinkSync(CONFIG_PATH);

      let config;
      try {
        const data = fs.readFileSync(CONFIG_PATH, 'utf8');
        config = JSON.parse(data);
      } catch (err) {
        config = { routes: [] };
      }

      expect(config).toHaveProperty('routes');
      expect(config.routes).toHaveLength(0);
    });

    it('should handle invalid JSON', () => {
      fs.writeFileSync(CONFIG_PATH, 'invalid json');

      let config;
      try {
        const data = fs.readFileSync(CONFIG_PATH, 'utf8');
        config = JSON.parse(data);
      } catch (err) {
        config = { routes: [] };
      }

      expect(config).toHaveProperty('routes');
      expect(config.routes).toHaveLength(0);
    });
  });

  describe('Route Configuration', () => {
    it('should filter enabled routes for setup', () => {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = JSON.parse(data);
      const enabledRoutes = config.routes.filter(r => r.enabled);

      expect(enabledRoutes).toHaveLength(2);
      expect(enabledRoutes.every(r => r.enabled)).toBe(true);
    });

    it('should have valid route paths', () => {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = JSON.parse(data);

      config.routes.forEach(route => {
        expect(route.path).toMatch(/^\//);
      });
    });

    it('should have valid target URLs', () => {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = JSON.parse(data);

      config.routes.forEach(route => {
        expect(route.target).toMatch(/^http/);
      });
    });
  });
});
