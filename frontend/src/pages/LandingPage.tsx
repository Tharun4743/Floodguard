import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, CloudRain, Map, ArrowRight, Activity } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col justify-between relative overflow-hidden">
      
      {/* Subtle Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100 opacity-60 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-100 opacity-50 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-20">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-blue-100 border border-blue-200 rounded-xl">
            <Brain className="h-6 w-6 text-blue-600" />
          </div>
          <span className="text-lg font-black tracking-widest text-gray-900 uppercase font-sans">
            AI <span className="text-blue-600">FloodGuard</span>
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <Link to="/login" className="text-sm font-semibold hover:text-blue-600 transition font-mono text-gray-500">
            Sign In
          </Link>
          <Link 
            to="/register" 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs tracking-wider uppercase transition shadow-sm"
          >
            Create Account
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-7xl mx-auto px-6 py-16 flex flex-col items-center justify-center text-center z-10 space-y-8 flex-1">
        
        {/* Status Badge */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-700 font-mono">
          <Activity className="h-3.5 w-3.5 animate-pulse text-blue-600" />
          <span>Active Swarm Monitoring Network Online</span>
        </div>

        {/* Title */}
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 leading-tight tracking-tight">
            Predict Flood Risks using{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">
              Autonomous AI
            </span>
          </h1>
          <p className="text-sm md:text-base text-gray-500 max-w-xl mx-auto font-sans leading-relaxed">
            AI FloodGuard connects telemetry sensor hubs and live weather APIs to predict flood events,
            direct evacuations, and coordinate emergency safe havens in real time.
          </p>
        </div>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          <Link 
            to="/login"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-sm flex items-center justify-center space-x-2 transition shadow-sm"
          >
            <span>Launch Command Control</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link 
            to="/register"
            className="px-6 py-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold rounded-xl text-sm transition shadow-sm"
          >
            Register Sector Profile
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl pt-16">
          
          {/* Card 1 */}
          <div className="bg-white border border-gray-200 shadow-sm p-6 rounded-2xl text-left space-y-3">
            <div className="p-3 bg-blue-100 border border-blue-200 rounded-xl w-fit">
              <CloudRain className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Live Weather Aggregates</h3>
            <p className="text-xs text-gray-500 leading-relaxed font-sans">
              Extracts high-fidelity atmospheric rainfall rates, temperatures, and 5-hour forecasts directly via Open-Meteo.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-gray-200 shadow-sm p-6 rounded-2xl text-left space-y-3">
            <div className="p-3 bg-teal-100 border border-teal-200 rounded-xl w-fit">
              <Brain className="h-5 w-5 text-teal-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Neural Risk Predictors</h3>
            <p className="text-xs text-gray-500 leading-relaxed font-sans">
              Evaluates current water volumes, historical sector trends, and rainfall totals to score risk probabilities.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-gray-200 shadow-sm p-6 rounded-2xl text-left space-y-3">
            <div className="p-3 bg-amber-100 border border-amber-200 rounded-xl w-fit">
              <Map className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Interactive Hydrographs</h3>
            <p className="text-xs text-gray-500 leading-relaxed font-sans">
              Visualizes dangerous drainage flows and overlays danger buffers on OpenStreetMap to map safe zones.
            </p>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-gray-200 py-6 text-center text-xs text-gray-400 z-20 font-mono">
        © 2026 AI FloodGuard System. Powered by Open-Meteo Telemetry & Supabase.
      </footer>

    </div>
  );
};

export default LandingPage;
