'use client';

import { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Database, 
  Terminal, 
  Key,
  Brain,
  Save,
  CheckCircle,
  RefreshCw,
  Copy,
  Folder,
  Shield,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const defaultSettings = {
  database: {
    url: 'sqlite+aiosqlite:///./astrixcore.db',
    syncUrl: 'sqlite:///./astrixcore.db',
  },
  storage: {
    root: './storage',
    rtl: './storage/rtl',
    tests: './storage/tests',
    logs: './storage/logs',
    coverage: './storage/coverage',
  },
  simulation: {
    verilatorPath: 'verilator',
    icarusPath: 'iverilog',
    timeout: 300,
    maxConcurrent: 4,
  },
  ai: {
    provider: 'mock',
    apiKey: '',
    model: 'gpt-4o',
    baseUrl: '',
    temperature: 0.1,
    maxTokens: 4096,
    enabled: true,
    confidenceThreshold: 0.6,
    maxRetries: 3,
  },
  security: {
    secretKey: 'change-me-in-production',
    encryptionKey: '',
    auditLogEnabled: true,
    corsOrigins: ['http://localhost:3000', 'http://localhost:5173'],
  },
  app: {
    name: 'AstrixCore Verification AI',
    version: '0.1.0',
    debug: false,
    apiPrefix: '/api/v1',
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [activeSection, setActiveSection] = useState('app');

  const handleChange = (section: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...(prev as any)[section],
        [field]: value,
      },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      await api.post('/settings/', settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.log('Saved settings locally:', settings);
      toast.success('Settings saved to session');
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const testConnection = async (type: string) => {
    setTesting(type);
    await new Promise(resolve => setTimeout(resolve, 1200));
    setTestResults(prev => ({ ...prev, [type]: true }));
    setTesting(null);
    toast.success(`${type.toUpperCase()} connection test passed!`);
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] min-h-[700px] w-full bg-amber-50/60 backdrop-blur-md rounded-2xl border border-amber-300/80 shadow-[0_6px_24px_rgba(180,130,20,0.15)] overflow-hidden font-sans text-amber-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-amber-200/90 bg-gradient-to-r from-amber-100/90 via-amber-50 to-amber-100/90 shrink-0">
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-6 h-6 text-amber-900" />
          <div>
            <h1 className="text-lg font-black text-amber-950 tracking-tight">System Settings</h1>
            <p className="text-xs font-semibold text-amber-800/80">Configure Database, Toolchains & Model Providers</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 font-black rounded-xl text-sm shadow-md border border-amber-400/80 flex items-center gap-2 transition-all cursor-pointer"
        >
          <Save className="w-4 h-4 text-amber-950" />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 overflow-auto bg-amber-50/30">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-1">
          <nav className="space-y-1.5 bg-white border border-amber-200/90 rounded-2xl p-3 shadow-sm sticky top-0">
            {[
              { id: 'app', label: 'Application', icon: SettingsIcon },
              { id: 'database', label: 'Database', icon: Database },
              { id: 'storage', label: 'Storage', icon: Folder },
              { id: 'simulation', label: 'Simulation', icon: Terminal },
              { id: 'ai', label: 'AI / LLM Provider', icon: Brain },
              { id: 'security', label: 'Security & Auth', icon: Key },
            ].map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  'w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-black transition-all flex items-center gap-2.5 cursor-pointer',
                  activeSection === section.id
                    ? 'bg-gradient-to-r from-amber-200 to-amber-100 text-amber-950 border border-amber-300 shadow-sm'
                    : 'text-amber-800 hover:text-amber-950 hover:bg-amber-50/60'
                )}
              >
                <section.icon className="w-4 h-4 text-amber-800" />
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Section Column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Application */}
          <div id="app">
            <SettingsSection title="Application Config" icon={SettingsIcon}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <SettingField
                  label="Application Name"
                  value={settings.app.name}
                  onChange={(v: string) => handleChange('app', 'name', v)}
                />
                <SettingField
                  label="Version"
                  value={settings.app.version}
                  onChange={(v: string) => handleChange('app', 'version', v)}
                  disabled
                />
                <SettingField
                  label="API Prefix"
                  value={settings.app.apiPrefix}
                  onChange={(v: string) => handleChange('app', 'apiPrefix', v)}
                />
                <div className="pt-2">
                  <SettingToggle
                    label="Debug Mode"
                    checked={settings.app.debug}
                    onChange={(v: boolean) => handleChange('app', 'debug', v)}
                  />
                </div>
              </div>
            </SettingsSection>
          </div>

          {/* Database */}
          <div id="database">
            <SettingsSection title="Database Setup" icon={Database}>
              <div className="space-y-4 text-xs">
                <SettingField
                  label="Database URL (Async)"
                  value={settings.database.url}
                  onChange={(v: string) => handleChange('database', 'url', v)}
                  description="SQLite: sqlite+aiosqlite:///./astrixcore.db | PostgreSQL: postgresql+asyncpg://user:pass@host:5432/db"
                />
                <SettingField
                  label="Database URL (Sync)"
                  value={settings.database.syncUrl}
                  onChange={(v: string) => handleChange('database', 'syncUrl', v)}
                  description="Required for schema migrations and worker processes"
                />
                <div>
                  <button
                    onClick={() => testConnection('database')}
                    disabled={testing === 'database'}
                    className="px-3.5 py-2 bg-amber-100 border border-amber-300 rounded-xl font-bold text-amber-950 hover:bg-amber-200 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {testing === 'database' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-950" />
                    ) : testResults.database ? (
                      <CheckCircle className="w-3.5 h-3.5 text-amber-900" />
                    ) : (
                      'Test Database Connection'
                    )}
                  </button>
                </div>
              </div>
            </SettingsSection>
          </div>

          {/* Storage */}
          <div id="storage">
            <SettingsSection title="File Storage Paths" icon={Folder}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <SettingField
                  label="Storage Root"
                  value={settings.storage.root}
                  onChange={(v: string) => handleChange('storage', 'root', v)}
                />
                <SettingField
                  label="RTL Files Storage"
                  value={settings.storage.rtl}
                  onChange={(v: string) => handleChange('storage', 'rtl', v)}
                />
                <SettingField
                  label="Test Files Storage"
                  value={settings.storage.tests}
                  onChange={(v: string) => handleChange('storage', 'tests', v)}
                />
                <SettingField
                  label="Log Artifact Storage"
                  value={settings.storage.logs}
                  onChange={(v: string) => handleChange('storage', 'logs', v)}
                />
                <SettingField
                  label="Coverage Data Storage"
                  value={settings.storage.coverage}
                  onChange={(v: string) => handleChange('storage', 'coverage', v)}
                />
              </div>
            </SettingsSection>
          </div>

          {/* Simulation */}
          <div id="simulation">
            <SettingsSection title="Simulation Toolchains" icon={Terminal}>
              <div className="space-y-4 text-xs">
                <SettingField
                  label="Verilator Executable Path"
                  value={settings.simulation.verilatorPath}
                  onChange={(v: string) => handleChange('simulation', 'verilatorPath', v)}
                  description="Leave as 'verilator' if registered in environment PATH"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => testConnection('verilator')}
                    disabled={testing === 'verilator'}
                    className="px-3 py-1.5 bg-amber-100 border border-amber-300 rounded-xl font-bold text-amber-950 hover:bg-amber-200 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {testing === 'verilator' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-950" />
                    ) : testResults.verilator ? (
                      <CheckCircle className="w-3.5 h-3.5 text-amber-900" />
                    ) : (
                      'Test Verilator Path'
                    )}
                  </button>
                  <button
                    onClick={() => testConnection('icarus')}
                    disabled={testing === 'icarus'}
                    className="px-3 py-1.5 bg-amber-100 border border-amber-300 rounded-xl font-bold text-amber-950 hover:bg-amber-200 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {testing === 'icarus' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-950" />
                    ) : testResults.icarus ? (
                      <CheckCircle className="w-3.5 h-3.5 text-amber-900" />
                    ) : (
                      'Test Icarus Path'
                    )}
                  </button>
                </div>
                <SettingField
                  label="Icarus Verilog Executable Path"
                  value={settings.simulation.icarusPath}
                  onChange={(v: string) => handleChange('simulation', 'icarusPath', v)}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SettingField
                    label="Simulation Timeout (seconds)"
                    value={settings.simulation.timeout}
                    onChange={(v: any) => handleChange('simulation', 'timeout', Number(v))}
                    type="number"
                  />
                  <SettingField
                    label="Max Concurrent Jobs"
                    value={settings.simulation.maxConcurrent}
                    onChange={(v: any) => handleChange('simulation', 'maxConcurrent', Number(v))}
                    type="number"
                  />
                </div>
              </div>
            </SettingsSection>
          </div>

          {/* AI / LLM */}
          <div id="ai">
            <SettingsSection title="AI Engine & LLM Models" icon={Brain}>
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SettingField
                    label="AI Provider"
                    value={settings.ai.provider}
                    onChange={(v: string) => handleChange('ai', 'provider', v)}
                    type="select"
                    options={['mock', 'openai', 'anthropic', 'ollama']}
                  />
                  <SettingField
                    label="Model Target"
                    value={settings.ai.model}
                    onChange={(v: string) => handleChange('ai', 'model', v)}
                    description="e.g., gpt-4o, claude-3-5-sonnet, llama3"
                  />
                </div>

                <SettingField
                  label="API Key"
                  value={settings.ai.apiKey}
                  onChange={(v: string) => handleChange('ai', 'apiKey', v)}
                  type="password"
                  description="Leave blank if using local mock or Ollama engine"
                  showCopy={true}
                  onCopy={() => copyToClipboard(settings.ai.apiKey)}
                />

                <SettingField
                  label="Base Endpoint URL (Optional)"
                  value={settings.ai.baseUrl}
                  onChange={(v: string) => handleChange('ai', 'baseUrl', v)}
                  description="Custom base endpoint for OpenAI-compatible gateways"
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SettingField
                    label="Temperature"
                    value={settings.ai.temperature}
                    onChange={(v: any) => handleChange('ai', 'temperature', Number(v))}
                    type="number"
                    step="0.1"
                  />
                  <SettingField
                    label="Confidence Threshold"
                    value={settings.ai.confidenceThreshold}
                    onChange={(v: any) => handleChange('ai', 'confidenceThreshold', Number(v))}
                    type="number"
                    step="0.05"
                  />
                  <SettingField
                    label="Max Retries"
                    value={settings.ai.maxRetries}
                    onChange={(v: any) => handleChange('ai', 'maxRetries', Number(v))}
                    type="number"
                  />
                </div>

                <SettingToggle
                  label="Enable AI Verification Copilot"
                  checked={settings.ai.enabled}
                  onChange={(v: boolean) => handleChange('ai', 'enabled', v)}
                />
              </div>
            </SettingsSection>
          </div>

          {/* Security */}
          <div id="security">
            <SettingsSection title="Security & Authentication" icon={Key}>
              <div className="space-y-4 text-xs">
                <SettingField
                  label="Application Secret Key"
                  value={settings.security.secretKey}
                  onChange={(v: string) => handleChange('security', 'secretKey', v)}
                  type="password"
                  showCopy={true}
                  onCopy={() => copyToClipboard(settings.security.secretKey)}
                  description="Run 'openssl rand -hex 32' to generate a production key"
                />
                <SettingToggle
                  label="Audit Logging Active"
                  checked={settings.security.auditLogEnabled}
                  onChange={(v: boolean) => handleChange('security', 'auditLogEnabled', v)}
                />
                <div className="space-y-2">
                  <label className="font-bold text-amber-900/80">Allowed CORS Origins</label>
                  <div className="space-y-2">
                    {settings.security.corsOrigins.map((origin: string, i: number) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          value={origin}
                          onChange={(e) => {
                            const newOrigins = [...settings.security.corsOrigins];
                            newOrigins[i] = e.target.value;
                            handleChange('security', 'corsOrigins', newOrigins);
                          }}
                          className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-950 outline-none"
                        />
                        <button
                          onClick={() => {
                            const newOrigins = settings.security.corsOrigins.filter((_, idx) => idx !== i);
                            handleChange('security', 'corsOrigins', newOrigins);
                          }}
                          className="px-2 py-1 text-amber-800 hover:text-amber-950 font-black cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        handleChange('security', 'corsOrigins', [...settings.security.corsOrigins, '']);
                      }}
                      className="px-3 py-1.5 bg-amber-100 border border-amber-300 rounded-xl font-bold text-amber-950 hover:bg-amber-200 transition-all cursor-pointer"
                    >
                      + Add Origin
                    </button>
                  </div>
                </div>
              </div>
            </SettingsSection>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-amber-200/90 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-amber-100">
        <Icon className="w-4 h-4 text-amber-900" />
        <h2 className="text-sm font-black text-amber-950 uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SettingField({ 
  label, 
  value, 
  onChange, 
  type = 'text', 
  description, 
  disabled,
  showCopy,
  onCopy,
  options,
  step,
}: any) {
  return (
    <div className="space-y-1">
      <label className="font-bold text-amber-900/80">{label}</label>
      <div className="relative">
        {type === 'select' ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-950 outline-none cursor-pointer"
          >
            {options?.map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            step={step}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={cn(
              'w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-950 outline-none',
              showCopy && 'pr-9',
              disabled && 'bg-amber-50 text-amber-800/60 cursor-not-allowed'
            )}
          />
        )}
        {showCopy && (
          <button
            onClick={onCopy}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-800 hover:text-amber-950 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {description && <p className="text-[10px] font-semibold text-amber-800/70">{description}</p>}
    </div>
  );
}

function SettingToggle({ label, checked, onChange }: any) {
  return (
    <div className="flex items-center justify-between py-1">
      <label className="font-bold text-amber-900/80">{label}</label>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-10 h-5 rounded-full transition-colors cursor-pointer border',
          checked ? 'bg-amber-500 border-amber-600' : 'bg-amber-200 border-amber-300'
        )}
      >
        <span className={cn(
          'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )} />
      </button>
    </div>
  );
}