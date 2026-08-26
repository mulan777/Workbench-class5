import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { ThemeProvider } from '@/lib/theme'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/stores/auth'
import { WorkspaceProvider } from '@/stores/workspace'
import { GlobalHosts } from '@/lib/ui'
import AppShell from '@/AppShell'
import Login from '@/views/Login'
import Home from '@/views/Home'
import Checkin from '@/views/Checkin'
import Area from '@/views/Area'
import Users from '@/views/Users'
import Theme1 from '@/views/Theme1'
import Theme2 from '@/views/Theme2'
import Hot from '@/views/Hot'
import ChildSelect from '@/views/ChildSelect'
import ChildPhotoUpload from '@/views/ChildPhotoUpload'

function Guard() {
  const auth = useAuth()
  if (!auth.loaded) return null
  return auth.user ? (
    <WorkspaceProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/checkin" element={<Checkin />} />
          <Route path="/area" element={<Area />} />
          <Route path="/users" element={<Users />} />
          <Route path="/theme1" element={<Theme1 />} />
          <Route path="/theme2" element={<Theme2 />} />
          <Route path="/hot" element={<Hot />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </WorkspaceProvider>
  ) : (
    <Navigate to="/login" replace />
  )
}

function App() {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/select" element={<ChildSelect />} />
              <Route path="/kiosk" element={<ChildSelect />} />
              <Route path="/photo" element={<ChildPhotoUpload />} />
              <Route path="/camera" element={<ChildPhotoUpload />} />
              <Route path="*" element={<Guard />} />
            </Routes>
            <GlobalHosts />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
