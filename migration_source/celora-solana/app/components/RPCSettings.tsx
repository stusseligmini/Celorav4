'use client';

import { useState, useEffect } from 'react';
import { CeloraRPCManager, RPCEndpoint } from '../lib/rpcManager';
import { 
  Settings,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Globe,
  Shield,
  Zap
} from 'lucide-react';

interface RPCSettingsProps {
  onBack: () => void;
}

export default function RPCSettings({ onBack }: RPCSettingsProps) {
  const [endpoints, setEndpoints] = useState<RPCEndpoint[]>([]);
  const [isTestingConnection, setIsTestingConnection] = useState<{ [key: string]: boolean }>({});
  const [connectionStatus, setConnectionStatus] = useState<{ [key: string]: boolean }>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEndpoint, setNewEndpoint] = useState<Partial<RPCEndpoint>>({
    blockchain: 'solana',
    network: 'mainnet',
    isCustom: true
  });
  const [activeTab, setActiveTab] = useState<'solana' | 'ethereum'>('solana');

  const rpcManager = new CeloraRPCManager();

  useEffect(() => {
    loadEndpoints();
  }, []);

  const loadEndpoints = () => {
    const defaultEndpoints = CeloraRPCManager.getDefaultEndpoints();
    const customEndpoints = JSON.parse(localStorage.getItem('custom-rpc-endpoints') || '[]');
    setEndpoints([...defaultEndpoints, ...customEndpoints]);
  };

  const saveCustomEndpoints = (customEndpoints: RPCEndpoint[]) => {
    localStorage.setItem('custom-rpc-endpoints', JSON.stringify(customEndpoints));
  };

  const testConnection = async (endpoint: RPCEndpoint, index: number) => {
    setIsTestingConnection(prev => ({ ...prev, [index]: true }));
    
    try {
      const isConnected = await rpcManager.testConnection(endpoint);
      setConnectionStatus(prev => ({ ...prev, [index]: isConnected }));
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, [index]: false }));
    } finally {
      setIsTestingConnection(prev => ({ ...prev, [index]: false }));
    }
  };

  const addCustomEndpoint = () => {
    if (!newEndpoint.name || !newEndpoint.url || !newEndpoint.blockchain) {
      return;
    }

    const endpoint: RPCEndpoint = {
      name: newEndpoint.name,
      url: newEndpoint.url,
      network: newEndpoint.network || 'mainnet',
      blockchain: newEndpoint.blockchain,
      isCustom: true
    };

    const customEndpoints = endpoints.filter(e => e.isCustom);
    customEndpoints.push(endpoint);
    saveCustomEndpoints(customEndpoints);
    
    setEndpoints(prev => [...prev, endpoint]);
    setNewEndpoint({ blockchain: 'solana', network: 'mainnet', isCustom: true });
    setShowAddForm(false);
  };

  const removeCustomEndpoint = (index: number) => {
    const endpoint = endpoints[index];
    if (!endpoint.isCustom) return;

    const newEndpoints = endpoints.filter((_, i) => i !== index);
    const customEndpoints = newEndpoints.filter(e => e.isCustom);
    
    setEndpoints(newEndpoints);
    saveCustomEndpoints(customEndpoints);
  };

  const filteredEndpoints = endpoints.filter(e => e.blockchain === activeTab);

  return (
    <div className="min-h-screen bg-[#041c24] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="mr-4 p-2 text-primary/70 hover:text-primary transition-colors"
            >
              ←
            </button>
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mr-4">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary">RPC Settings</h1>
                <p className="text-primary/70 text-sm">Configure blockchain connections</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80 text-white px-6 py-2 rounded-xl font-semibold transition-all flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add RPC
          </button>
        </div>

        {/* Blockchain Tabs */}
        <div className="flex mb-6 bg-[#062830]/70 rounded-xl p-1 max-w-sm">
          <button
            onClick={() => setActiveTab('solana')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center ${
              activeTab === 'solana' 
                ? 'bg-gradient-to-r from-primary to-secondary text-white' 
                : 'text-primary/70 hover:text-primary'
            }`}
          >
            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-2">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            Solana
          </button>
          <button
            onClick={() => setActiveTab('ethereum')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center ${
              activeTab === 'ethereum' 
                ? 'bg-gradient-to-r from-primary to-secondary text-white' 
                : 'text-primary/70 hover:text-primary'
            }`}
          >
            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-2">
              <span className="text-white text-xs font-bold">E</span>
            </div>
            Ethereum
          </button>
        </div>

        {/* Add RPC Form */}
        {showAddForm && (
          <div className="bg-[#062830]/70 backdrop-blur-md rounded-xl p-6 border border-primary/20 mb-6">
            <h3 className="text-lg font-bold text-primary mb-4">Add Custom RPC Endpoint</h3>
            
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-primary text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={newEndpoint.name || ''}
                    onChange={(e) => setNewEndpoint(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My Custom RPC"
                    className="w-full bg-[#041c24] border border-primary/20 rounded-lg px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-primary text-sm font-medium mb-2">Blockchain</label>
                  <select
                    value={newEndpoint.blockchain || 'solana'}
                    onChange={(e) => setNewEndpoint(prev => ({ ...prev, blockchain: e.target.value as 'solana' | 'ethereum' }))}
                    className="w-full bg-[#041c24] border border-primary/20 rounded-lg px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="solana">Solana</option>
                    <option value="ethereum">Ethereum</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-primary text-sm font-medium mb-2">RPC URL</label>
                <input
                  type="url"
                  value={newEndpoint.url || ''}
                  onChange={(e) => setNewEndpoint(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://api.mainnet-beta.solana.com"
                  className="w-full bg-[#041c24] border border-primary/20 rounded-lg px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Network</label>
                <select
                  value={newEndpoint.network || 'mainnet'}
                  onChange={(e) => setNewEndpoint(prev => ({ ...prev, network: e.target.value as 'mainnet' | 'testnet' | 'devnet' }))}
                  className="w-full bg-[#041c24] border border-primary/20 rounded-lg px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="mainnet">Mainnet</option>
                  <option value="testnet">Testnet</option>
                  <option value="devnet">Devnet</option>
                </select>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={addCustomEndpoint}
                  className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-2 rounded-lg font-medium transition-all"
                >
                  Add Endpoint
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="bg-primary/20 text-primary px-6 py-2 rounded-lg font-medium transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RPC Endpoints List */}
        <div className="space-y-4">
          {filteredEndpoints.map((endpoint, index) => (
            <div key={`${endpoint.name}-${index}`} className="bg-[#062830]/70 backdrop-blur-md rounded-xl p-6 border border-primary/20">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-semibold text-primary mr-3">{endpoint.name}</h3>
                    
                    <div className="flex items-center space-x-2">
                      {/* Network Badge */}
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        endpoint.network === 'mainnet' 
                          ? 'bg-green-500/20 text-green-400' 
                          : endpoint.network === 'testnet'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {endpoint.network}
                      </span>
                      
                      {/* Custom Badge */}
                      {endpoint.isCustom && (
                        <span className="px-2 py-1 bg-primary/20 text-primary rounded-lg text-xs font-medium">
                          Custom
                        </span>
                      )}
                      
                      {/* Connection Status */}
                      <div className="flex items-center">
                        {connectionStatus[index] === true && (
                          <div className="flex items-center text-green-400 text-xs">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Connected
                          </div>
                        )}
                        {connectionStatus[index] === false && (
                          <div className="flex items-center text-red-400 text-xs">
                            <XCircle className="w-4 h-4 mr-1" />
                            Failed
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-primary/70 text-sm break-all">{endpoint.url}</p>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => testConnection(endpoint, index)}
                    disabled={isTestingConnection[index]}
                    className="p-2 text-primary/70 hover:text-primary transition-colors disabled:opacity-50"
                    title="Test Connection"
                  >
                    <RefreshCw className={`w-4 h-4 ${isTestingConnection[index] ? 'animate-spin' : ''}`} />
                  </button>
                  
                  {endpoint.isCustom && (
                    <button
                      onClick={() => removeCustomEndpoint(index)}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Features */}
              <div className="flex items-center space-x-6 text-sm text-primary/70">
                <div className="flex items-center">
                  <Globe className="w-4 h-4 mr-1" />
                  {endpoint.blockchain} Network
                </div>
                <div className="flex items-center">
                  <Shield className="w-4 h-4 mr-1" />
                  Secure Connection
                </div>
                <div className="flex items-center">
                  <Zap className="w-4 h-4 mr-1" />
                  High Performance
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredEndpoints.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-primary mb-2">No {activeTab} RPC endpoints</h3>
            <p className="text-primary/70 mb-6">Add a custom RPC endpoint to get started</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-xl font-medium"
            >
              Add First RPC
            </button>
          </div>
        )}

        {/* Information Section */}
        <div className="mt-8 bg-[#062830]/70 backdrop-blur-md rounded-xl p-6 border border-primary/20">
          <h3 className="text-lg font-bold text-primary mb-4">Why Configure Custom RPC?</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center mb-3">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <h4 className="font-semibold text-primary mb-2">Better Performance</h4>
              <p className="text-primary/70 text-sm">
                Use premium RPC providers for faster transaction processing and lower latency
              </p>
            </div>
            
            <div>
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center mb-3">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <h4 className="font-semibold text-primary mb-2">Enhanced Privacy</h4>
              <p className="text-primary/70 text-sm">
                Connect through your own nodes or trusted providers for better privacy
              </p>
            </div>
            
            <div>
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center mb-3">
                <Globe className="w-4 h-4 text-white" />
              </div>
              <h4 className="font-semibold text-primary mb-2">Global Access</h4>
              <p className="text-primary/70 text-sm">
                Choose regional endpoints for optimal connection speeds in your area
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}