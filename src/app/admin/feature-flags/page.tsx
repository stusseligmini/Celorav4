'use client';

import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseSingleton';
import { featureFlags, FeatureFlag, TargetingRule } from '@/lib/featureFlags';

export default function FeatureFlagAdmin() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [showNewFlagForm, setShowNewFlagForm] = useState(false);

  // Load flags on mount
  useEffect(() => {
    fetchFlags();
  }, []);

  async function fetchFlags() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await getSupabaseClient()
        .from('feature_flags')
        .select('*')
        .order('name');

      if (error) throw error;
      setFlags(data || []);
    } catch (err) {
      console.error('Error fetching feature flags:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  }

  async function toggleFlag(flag: FeatureFlag) {
    try {
      const { error } = await getSupabaseClient()
        .from('feature_flags')
        .update({ is_enabled: !flag.is_enabled })
        .eq('name', flag.name);

      if (error) throw error;
      setFlags(flags.map(f => 
        f.name === flag.name ? { ...f, is_enabled: !f.is_enabled } : f
      ));
    } catch (err) {
      console.error('Error updating feature flag:', err);
      setError(err instanceof Error ? err.message : 'Failed to update feature flag');
    }
  }

  async function saveFlag(flag: FeatureFlag) {
    try {
      const { error } = await getSupabaseClient()
        .from('feature_flags')
        .upsert(flag, { onConflict: 'name' });

      if (error) throw error;
      
      await fetchFlags(); // Refresh all flags
      setEditingFlag(null);
      setShowNewFlagForm(false);
    } catch (err) {
      console.error('Error saving feature flag:', err);
      setError(err instanceof Error ? err.message : 'Failed to save feature flag');
    }
  }

  async function deleteFlag(flagName: string) {
    if (!confirm(`Are you sure you want to delete the feature flag "${flagName}"?`)) {
      return;
    }

    try {
      const { error } = await getSupabaseClient()
        .from('feature_flags')
        .delete()
        .eq('name', flagName);

      if (error) throw error;
      
      setFlags(flags.filter(f => f.name !== flagName));
    } catch (err) {
      console.error('Error deleting feature flag:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete feature flag');
    }
  }

  function handleNewFlag() {
    setEditingFlag({
      name: '',
      description: '',
      is_enabled: false
    });
    setShowNewFlagForm(true);
  }

  if (loading && flags.length === 0) {
    return <div className="p-6">Loading feature flags...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Feature Flag Management</h1>
        <button
          onClick={handleNewFlag}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Create New Flag
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {showNewFlagForm && editingFlag && (
        <FeatureFlagForm 
          flag={editingFlag} 
          onSave={saveFlag}
          onCancel={() => {
            setEditingFlag(null);
            setShowNewFlagForm(false);
          }}
        />
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Targeting
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {flags.map((flag) => (
              <tr key={flag.name}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {flag.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {flag.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleFlag(flag)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      flag.is_enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {flag.is_enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {flag.user_percentage ? `${flag.user_percentage}% of users` : '100% of users'}
                  {flag.targeting_rules && flag.targeting_rules.length > 0 && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      Custom Rules
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => setEditingFlag(flag)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteFlag(flag.name)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {flags.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No feature flags found. Create your first feature flag to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingFlag && !showNewFlagForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl">
            <h2 className="text-xl font-bold mb-4">Edit Feature Flag</h2>
            <FeatureFlagForm
              flag={editingFlag}
              onSave={saveFlag}
              onCancel={() => setEditingFlag(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface FeatureFlagFormProps {
  flag: FeatureFlag;
  onSave: (flag: FeatureFlag) => void;
  onCancel: () => void;
}

function FeatureFlagForm({ flag, onSave, onCancel }: FeatureFlagFormProps) {
  const [formData, setFormData] = useState<FeatureFlag>({...flag});
  const [targetingType, setTargetingType] = useState<'all' | 'percentage' | 'rules'>(
    flag.targeting_rules && flag.targeting_rules.length > 0 ? 'rules' :
    flag.user_percentage ? 'percentage' : 'all'
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      [name]: checked
    });
  };

  const handlePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFormData({
      ...formData,
      user_percentage: isNaN(value) ? undefined : Math.max(0, Math.min(100, value))
    });
  };

  const handleAddRule = () => {
    const newRule: TargetingRule = {
      attribute: 'role',
      operator: 'equals',
      value: ''
    };

    setFormData({
      ...formData,
      targeting_rules: [...(formData.targeting_rules || []), newRule]
    });
  };

  const handleUpdateRule = (index: number, key: keyof TargetingRule, value: any) => {
    const updatedRules = [...(formData.targeting_rules || [])];
    updatedRules[index] = {
      ...updatedRules[index],
      [key]: value
    };

    setFormData({
      ...formData,
      targeting_rules: updatedRules
    });
  };

  const handleRemoveRule = (index: number) => {
    const updatedRules = [...(formData.targeting_rules || [])];
    updatedRules.splice(index, 1);
    
    setFormData({
      ...formData,
      targeting_rules: updatedRules
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare the flag data based on targeting type
    let flagToSave: FeatureFlag = {...formData};
    
    if (targetingType === 'all') {
      flagToSave.user_percentage = undefined;
      flagToSave.targeting_rules = undefined;
    } else if (targetingType === 'percentage') {
      flagToSave.targeting_rules = undefined;
    } else if (targetingType === 'rules') {
      flagToSave.user_percentage = undefined;
    }
    
    onSave(flagToSave);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        <div className="sm:col-span-3">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Flag Name
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="name"
              id="name"
              required
              disabled={!!flag.name} // Can't edit name if it's an existing flag
              value={formData.name}
              onChange={handleInputChange}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="e.g., new_dashboard_ui"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Use lowercase letters, numbers, and underscores. Cannot be changed later.
          </p>
        </div>

        <div className="sm:col-span-6">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <div className="mt-1">
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleInputChange}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Describe what this feature flag controls"
            />
          </div>
        </div>

        <div className="sm:col-span-6">
          <div className="flex items-center">
            <input
              id="is_enabled"
              name="is_enabled"
              type="checkbox"
              checked={formData.is_enabled}
              onChange={handleToggleChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="is_enabled" className="ml-2 block text-sm text-gray-700">
              Enable this feature flag
            </label>
          </div>
        </div>

        <div className="sm:col-span-6">
          <fieldset>
            <legend className="text-sm font-medium text-gray-700">Targeting</legend>
            <div className="mt-2 space-y-4">
              <div className="flex items-center">
                <input
                  id="targeting-all"
                  name="targeting"
                  type="radio"
                  checked={targetingType === 'all'}
                  onChange={() => setTargetingType('all')}
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                />
                <label htmlFor="targeting-all" className="ml-2 block text-sm text-gray-700">
                  All users (100%)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="targeting-percentage"
                  name="targeting"
                  type="radio"
                  checked={targetingType === 'percentage'}
                  onChange={() => setTargetingType('percentage')}
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                />
                <label htmlFor="targeting-percentage" className="ml-2 block text-sm text-gray-700">
                  Percentage of users
                </label>
              </div>

              {targetingType === 'percentage' && (
                <div className="ml-6">
                  <label htmlFor="user_percentage" className="block text-sm font-medium text-gray-700">
                    Percentage (0-100)
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      name="user_percentage"
                      id="user_percentage"
                      min={0}
                      max={100}
                      value={formData.user_percentage || ''}
                      onChange={handlePercentageChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <input
                  id="targeting-rules"
                  name="targeting"
                  type="radio"
                  checked={targetingType === 'rules'}
                  onChange={() => setTargetingType('rules')}
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                />
                <label htmlFor="targeting-rules" className="ml-2 block text-sm text-gray-700">
                  Custom targeting rules
                </label>
              </div>

              {targetingType === 'rules' && (
                <div className="ml-6 space-y-4">
                  {(formData.targeting_rules || []).map((rule, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <select
                          value={rule.attribute}
                          onChange={(e) => handleUpdateRule(index, 'attribute', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                          <option value="role">Role</option>
                          <option value="email">Email</option>
                          <option value="country">Country</option>
                          <option value="userId">User ID</option>
                          <option value="deviceType">Device Type</option>
                          <option value="version">App Version</option>
                          <option value="customAttributes.plan">Plan</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <select
                          value={rule.operator}
                          onChange={(e) => handleUpdateRule(index, 'operator', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                          <option value="equals">Equals</option>
                          <option value="not_equals">Not Equals</option>
                          <option value="contains">Contains</option>
                          <option value="not_contains">Not Contains</option>
                          <option value="in">In List</option>
                          <option value="not_in">Not In List</option>
                        </select>
                      </div>
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={rule.value as string}
                          onChange={(e) => handleUpdateRule(index, 'value', e.target.value)}
                          placeholder="Value"
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                      <div className="col-span-1">
                        <button
                          type="button"
                          onClick={() => handleRemoveRule(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-md hover:bg-indigo-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Rule
                  </button>
                </div>
              )}
            </div>
          </fieldset>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Save
        </button>
      </div>
    </form>
  );
}