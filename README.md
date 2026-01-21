# Pi Gateway

A lightweight API gateway for Raspberry Pi that allows hosting multiple web apps through a single exposed port.

## Features

- **Single Port Access**: Expose one port to the outside world, access all your apps
- **Path-based Routing**: Route requests like `/blog` → `localhost:3001`, `/api` → `localhost:4000`
- **Easy Configuration**: JSON-based route configuration
- **CLI Management**: Add, remove, and toggle routes via command line
- **Health Checks**: Built-in health endpoint
- **Lightweight**: Minimal dependencies, perfect for Pi's limited resources

## Quick Start

```bash
# Install dependencies
npm install

# Start the gateway (default port 8080)
npm start

# Or use a custom port
PORT=80 npm start
```

## Managing Routes

### List all routes
```bash
npm run manage list
```

### Add a new route
```bash
npm run manage add /blog http://localhost:3001 "My Blog"
npm run manage add /api http://localhost:4000 "REST API"
```

### Remove a route
```bash
npm run manage remove /blog
```

### Enable/disable a route
```bash
npm run manage toggle /api
```

## Configuration

Routes are stored in `config/routes.json`:

```json
{
  "routes": [
    {
      "path": "/blog",
      "target": "http://localhost:3001",
      "name": "My Blog",
      "enabled": true
    }
  ]
}
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check status |
| `GET /api/routes` | List all configured routes |

## Example Setup

1. Start your web apps on different ports:
   - Blog on port 3001
   - API on port 4000
   - Dashboard on port 5000

2. Configure the gateway:
   ```bash
   npm run manage add /blog http://localhost:3001 "Blog"
   npm run manage add /api http://localhost:4000 "API"
   npm run manage add /dashboard http://localhost:5000 "Dashboard"
   ```

3. Start the gateway on port 80:
   ```bash
   sudo PORT=80 npm start
   ```

4. Access your apps:
   - `http://your-pi/blog` → Blog
   - `http://your-pi/api` → API
   - `http://your-pi/dashboard` → Dashboard

## Running as a Service (systemd)

Create `/etc/systemd/system/pi-gateway.service`:

```ini
[Unit]
Description=Pi Gateway
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/pi-gateway
ExecStart=/usr/bin/node src/gateway.js
Environment=PORT=80
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then enable and start:
```bash
sudo systemctl enable pi-gateway
sudo systemctl start pi-gateway
```

## License

ISC
