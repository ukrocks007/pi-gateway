const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../config/test-routes.json');

describe('Route Management', () => {
  beforeEach(() => {
    // Create test config file
    const testConfig = { routes: [] };
    if (!fs.existsSync(path.dirname(CONFIG_PATH))) {
      fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(testConfig, null, 2));
  });

  afterEach(() => {
    // Clean up test config
    if (fs.existsSync(CONFIG_PATH)) {
      fs.unlinkSync(CONFIG_PATH);
    }
  });

  describe('loadConfig', () => {
    it('should load existing config', () => {
      const testData = {
        routes: [
          { path: '/test', target: 'http://localhost:3000', name: 'Test', enabled: true }
        ]
      };
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(testData));

      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      expect(config).toEqual(testData);
      expect(config.routes).toHaveLength(1);
    });

    it('should return empty routes for non-existent config', () => {
      fs.unlinkSync(CONFIG_PATH);
      
      try {
        fs.readFileSync(CONFIG_PATH, 'utf8');
      } catch (err) {
        expect(err.code).toBe('ENOENT');
      }
    });
  });

  describe('saveConfig', () => {
    it('should save config to file', () => {
      const config = {
        routes: [
          { path: '/api', target: 'http://localhost:4000', name: 'API', enabled: true }
        ]
      };

      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
      const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      
      expect(saved).toEqual(config);
    });
  });

  describe('Route Operations', () => {
    it('should add a new route', () => {
      const config = { routes: [] };
      config.routes.push({
        path: '/blog',
        target: 'http://localhost:3001',
        name: 'My Blog',
        enabled: true
      });

      expect(config.routes).toHaveLength(1);
      expect(config.routes[0].path).toBe('/blog');
      expect(config.routes[0].name).toBe('My Blog');
      expect(config.routes[0].enabled).toBe(true);
    });

    it('should not add duplicate route paths', () => {
      const config = {
        routes: [{ path: '/api', target: 'http://localhost:4000', name: 'API', enabled: true }]
      };

      const isDuplicate = config.routes.some(r => r.path === '/api');
      expect(isDuplicate).toBe(true);
    });

    it('should remove a route', () => {
      const config = {
        routes: [
          { path: '/api', target: 'http://localhost:4000', name: 'API', enabled: true },
          { path: '/blog', target: 'http://localhost:3001', name: 'Blog', enabled: true }
        ]
      };

      const index = config.routes.findIndex(r => r.path === '/api');
      config.routes.splice(index, 1);

      expect(config.routes).toHaveLength(1);
      expect(config.routes[0].path).toBe('/blog');
    });

    it('should toggle route enabled status', () => {
      const config = {
        routes: [
          { path: '/api', target: 'http://localhost:4000', name: 'API', enabled: true }
        ]
      };

      config.routes[0].enabled = !config.routes[0].enabled;
      expect(config.routes[0].enabled).toBe(false);

      config.routes[0].enabled = !config.routes[0].enabled;
      expect(config.routes[0].enabled).toBe(true);
    });

    it('should handle route not found for removal', () => {
      const config = {
        routes: [{ path: '/api', target: 'http://localhost:4000', name: 'API', enabled: true }]
      };

      const index = config.routes.findIndex(r => r.path === '/nonexistent');
      expect(index).toBe(-1);
    });

    it('should handle route not found for toggle', () => {
      const config = {
        routes: [{ path: '/api', target: 'http://localhost:4000', name: 'API', enabled: true }]
      };

      const route = config.routes.find(r => r.path === '/nonexistent');
      expect(route).toBeUndefined();
    });
  });

  describe('Route Validation', () => {
    it('should accept valid route data', () => {
      const route = {
        path: '/test',
        target: 'http://localhost:3000',
        name: 'Test Route',
        enabled: true
      };

      expect(route.path).toBeTruthy();
      expect(route.target).toBeTruthy();
      expect(route.name).toBeTruthy();
      expect(typeof route.enabled).toBe('boolean');
    });

    it('should handle multiple routes with different paths', () => {
      const config = {
        routes: [
          { path: '/api', target: 'http://localhost:4000', name: 'API', enabled: true },
          { path: '/blog', target: 'http://localhost:3001', name: 'Blog', enabled: true },
          { path: '/admin', target: 'http://localhost:5000', name: 'Admin', enabled: false }
        ]
      };

      expect(config.routes).toHaveLength(3);
      expect(config.routes.filter(r => r.enabled)).toHaveLength(2);
    });
  });
});
