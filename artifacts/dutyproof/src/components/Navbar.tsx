import { Shield } from 'lucide-react'

interface NavbarProps {
  onGetStarted: () => void
  onLogoClick: () => void
}

export default function Navbar({ onGetStarted, onLogoClick }: NavbarProps) {
  return (
    <nav className="bg-navy-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button 
              onClick={onLogoClick}
              className="flex items-center space-x-2 hover:opacity-80 transition"
            >
              <Shield className="h-8 w-8 text-blue-400" />
              <span className="text-xl font-bold">DutyProof</span>
            </button>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                <a href="#features" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition">
                  Features
                </a>
                <a href="#compliance" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition">
                  Compliance
                </a>
                <a href="#pricing" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition">
                  Pricing
                </a>
                <a href="#about" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition">
                  About
                </a>
              </div>
            </div>
          </div>
          <div>
            <button
              onClick={onGetStarted}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium transition"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
