import { useState } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Dashboard from './components/Dashboard'

function App() {
  const [view, setView] = useState<'landing' | 'dashboard'>('landing')

  const handleStartTrial = () => {
    setView('dashboard')
  }

  const handleBackToHome = () => {
    setView('landing')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onGetStarted={handleStartTrial} onLogoClick={handleBackToHome} />
      {view === 'landing' ? (
        <Hero onStartTrial={handleStartTrial} />
      ) : (
        <Dashboard />
      )}
    </div>
  )
}

export default App
