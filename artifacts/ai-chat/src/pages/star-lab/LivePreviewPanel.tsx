import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor, Smartphone, Tablet, ExternalLink, RefreshCw, X,
  Loader2, AlertCircle, Eye, Globe, Clock, CheckCircle2
} from 'lucide-react';
import { getApiBase } from '@/lib/api-base';

type DeployedApp = {
  appName: string;
  slug: string;
  url: string;
  port: number;
  pid?: number;
  deployedAt: string;
  projectId?: number;
  sessionId?: number;
};

type ViewportSize = 'mobile' | 'tablet' | 'desktop';

const VIEWPORT_SIZES: Record<ViewportSize, { width: string; height: string; label: string; icon: any }> = {
  mobile: { width: '375px', height: '667px', label: 'Mobile', icon: Smartphone },
  tablet: { width: '768px', height: '1024px', label: 'Tablet', icon: Tablet },
  desktop: { width: '100%', height: '100%', label: 'Desktop', icon: Monitor },
};

interface LivePreviewPanelProps {
  pin: string;
  selectedApp?: DeployedApp | null;
  onClose?: () => void;
}

export function LivePreviewPanel({ pin, selectedApp, onClose }: LivePreviewPanelProps) {
  const API = getApiBase();
  const [apps, setApps] = useState<DeployedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentApp, setCurrentApp] = useState<DeployedApp | null>(selectedApp || null);
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoading, setIframeLoading] = useState(true);

  // Fetch deployed apps
  useEffect(() => {
    fetchDeployedApps();
    const interval = setInterval(fetchDeployedApps, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Update current app if selectedApp prop changes
  useEffect(() => {
    if (selectedApp) {
      setCurrentApp(selectedApp);
      setIframeKey(k => k + 1);
      setIframeLoading(true);
    }
  }, [selectedApp]);

  const fetchDeployedApps = async () => {
    try {
      const res = await fetch(`${API}lab/app-builder/deployed`, {
        headers: { 'x-lab-pin': pin }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setApps(data.apps || []);
      setError(null);
    } catch (err) {
      setError('Failed to load deployed apps');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setIframeKey(k => k + 1);
    setIframeLoading(true);
  };

  const handleOpenInNewTab = () => {
    if (currentApp) {
      window.open(currentApp.url, '_blank');
    }
  };

  const handleIframeLoad = () => {
    setIframeLoading(false);
  };

  const { width, height } = VIEWPORT_SIZES[viewport];

  return (
    <div className="flex h-full bg-slate-950 text-white">
      {/* App List Sidebar */}
      <div className="w-72 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-5 h-5 text-copper-400" />
            <h3 className="text-sm font-semibold text-white">Live Apps</h3>
          </div>
          <button
            onClick={fetchDeployedApps}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && apps.length === 0 ? (
            <div className="p-4 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-copper-400" />
              <p className="text-sm text-slate-400">Loading apps...</p>
            </div>
          ) : error && apps.length === 0 ? (
            <div className="p-4 text-center">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : apps.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              <Globe className="w-12 h-12 mx-auto mb-3 text-slate-700" />
              <p className="mb-1">No deployed apps</p>
              <p className="text-xs">Deploy an app to see it here</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {apps.map((app) => (
                <button
                  key={app.slug}
                  onClick={() => {
                    setCurrentApp(app);
                    setIframeKey(k => k + 1);
                    setIframeLoading(true);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    currentApp?.slug === app.slug
                      ? 'bg-copper-500/10 border-copper-500/50'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate">
                        {app.appName}
                      </h4>
                      <p className="text-xs text-slate-400 truncate">
                        {app.slug}
                      </p>
                    </div>
                    <div className={`flex-shrink-0 ml-2 ${
                      app.pid ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      {app.pid ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {new Date(app.deployedAt).toLocaleString()}
                  </div>
                  
                  {app.port && (
                    <div className="mt-1 text-xs text-slate-600">
                      Port: {app.port}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex flex-col">
        {currentApp ? (
          <>
            {/* Toolbar */}
            <div className="h-14 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-white truncate max-w-xs">
                  {currentApp.appName}
                </h3>
                <a
                  href={currentApp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-copper-400 hover:text-copper-300 flex items-center gap-1 transition-colors"
                >
                  <Globe className="w-3 h-3" />
                  {currentApp.url.replace('https://', '')}
                </a>
              </div>

              <div className="flex items-center gap-2">
                {/* Viewport Toggle */}
                <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
                  {(Object.entries(VIEWPORT_SIZES) as [ViewportSize, typeof VIEWPORT_SIZES[ViewportSize]][]).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setViewport(key)}
                        className={`p-2 rounded transition-colors ${
                          viewport === key
                            ? 'bg-copper-500 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title={config.label}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleRefresh}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                  title="Refresh preview"
                >
                  <RefreshCw className={`w-4 h-4 ${iframeLoading ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={handleOpenInNewTab}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>

                {onClose && (
                  <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                    title="Close preview"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Preview Frame */}
            <div className="flex-1 bg-slate-900 flex items-center justify-center p-4 overflow-auto">
              <div
                className="bg-white rounded-lg shadow-2xl relative transition-all duration-300 ease-in-out"
                style={{
                  width: viewport === 'desktop' ? '100%' : width,
                  height: viewport === 'desktop' ? '100%' : height,
                  maxWidth: viewport === 'desktop' ? '100%' : width,
                  maxHeight: viewport === 'desktop' ? '100%' : height,
                }}
              >
                {iframeLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950 rounded-lg z-10">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-copper-400" />
                      <p className="text-sm text-slate-400">Loading preview...</p>
                    </div>
                  </div>
                )}
                
                <iframe
                  key={iframeKey}
                  src={currentApp.url}
                  className="w-full h-full rounded-lg border-0"
                  title={currentApp.appName}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  onLoad={handleIframeLoad}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <Eye className="w-16 h-16 mx-auto mb-4 text-slate-700" />
              <p className="text-lg mb-2">No app selected</p>
              <p className="text-sm">Select an app from the sidebar to preview it</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
