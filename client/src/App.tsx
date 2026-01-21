import { useState } from 'react'
import axios from 'axios'
import { Plus, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface Route {
  path: string
  target: string
  name: string
  enabled: boolean
}

function App() {
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // New Route State
  const [newRoutePath, setNewRoutePath] = useState('')
  const [newRouteTarget, setNewRouteTarget] = useState('')
  const [newRouteName, setNewRouteName] = useState('')

  const getAuthHeader = () => {
    return {
      Authorization: `Basic ${btoa(`${user}:${password}`)}`
    }
  }

  const checkLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await axios.post('/management/api/login', {}, { headers: getAuthHeader() })
      setIsLoggedIn(true)
      fetchRoutes()
    } catch (err) {
      setError('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const fetchRoutes = async () => {
    try {
      const res = await axios.get('/management/api/routes', { headers: getAuthHeader() })
      setRoutes(res.data)
    } catch (err) {
      console.error('Failed to fetch routes')
    }
  }

  const addRoute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoutePath || !newRouteTarget || !newRouteName) return

    try {
      await axios.post('/management/api/routes', {
        path: newRoutePath,
        target: newRouteTarget,
        name: newRouteName
      }, { headers: getAuthHeader() })
      
      setNewRoutePath('')
      setNewRouteTarget('')
      setNewRouteName('')
      fetchRoutes()
    } catch (err) {
      setError('Failed to add route')
    }
  }

  const deleteRoute = async (path: string) => {
    if (!confirm(`Are you sure you want to delete route ${path}?`)) return
    try {
      await axios.delete('/management/api/routes', { 
        headers: getAuthHeader(),
        data: { path } 
      })
      fetchRoutes()
    } catch (err) {
      console.error('Failed to delete route')
    }
  }

  const toggleRoute = async (path: string, currentStatus: boolean) => {
    try {
      await axios.patch('/management/api/routes', {
        path,
        enabled: !currentStatus
      }, { headers: getAuthHeader() })
      fetchRoutes()
    } catch (err) {
      console.error('Failed to toggle route')
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>Pi Gateway Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={checkLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  value={user} 
                  onChange={e => setUser(e.target.value)} 
                  placeholder="admin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" 
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Checking...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Pi Gateway Management</h1>
          <Button variant="outline" onClick={() => setIsLoggedIn(false)}>Logout</Button>
        </div>

        {/* Add Route Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add New Route</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addRoute} className="flex gap-4 items-end">
              <div className="grid gap-2 flex-1">
                <Label htmlFor="path">Path Prefix</Label>
                <Input 
                  id="path" 
                  placeholder="/app" 
                  value={newRoutePath}
                  onChange={e => setNewRoutePath(e.target.value)}
                />
              </div>
              <div className="grid gap-2 flex-1">
                <Label htmlFor="target">Target URL</Label>
                <Input 
                  id="target" 
                  placeholder="http://localhost:3000" 
                  value={newRouteTarget}
                  onChange={e => setNewRouteTarget(e.target.value)}
                />
              </div>
              <div className="grid gap-2 flex-1">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  placeholder="My App" 
                  value={newRouteName}
                  onChange={e => setNewRouteName(e.target.value)}
                />
              </div>
              <Button type="submit">
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Routes List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Configured Routes</h2>
          {routes.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground border rounded-lg bg-white">
              No routes configured yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {routes.map((route) => (
                <Card key={route.path} className="overflow-hidden">
                  <div className="flex items-center p-6 gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{route.name}</h3>
                        <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-1 rounded">
                          {route.path}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ExternalLink className="h-3 w-3" />
                        {route.target}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`switch-${route.path}`} className="text-sm text-muted-foreground">
                          {route.enabled ? 'Enabled' : 'Disabled'}
                        </Label>
                        <Switch 
                          id={`switch-${route.path}`}
                          checked={route.enabled}
                          onCheckedChange={() => toggleRoute(route.path, route.enabled)}
                        />
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteRoute(route.path)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
