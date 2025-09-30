/**
 * Feature Flag System for Celora V2
 * 
 * This module provides a comprehensive feature flag system that allows for:
 * - Gradual rollout of features to users
 * - A/B testing
 * - Feature toggling for specific user groups
 * - Override of feature flags for development and testing
 * - Centralized management of feature availability
 * 
 * The system integrates with Supabase to retrieve feature flags configuration
 * and provides mechanisms for real-time updates.
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseSingleton';

export interface FeatureFlag {
  name: string;
  description: string;
  is_enabled: boolean;
  user_percentage?: number;
  targeting_rules?: TargetingRule[];
  is_sticky?: boolean;
  variant_distribution?: VariantDistribution[];
  last_updated?: string;
  created_at?: string;
}

export interface TargetingRule {
  attribute: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: string | number | boolean | Array<string | number | boolean>;
}

export interface VariantDistribution {
  variant_name: string;
  percentage: number;
  payload?: any;
}

export interface UserContext {
  userId?: string;
  email?: string;
  role?: string;
  country?: string;
  language?: string;
  deviceType?: string;
  userAgent?: string;
  version?: string;
  timezone?: string;
  accountAge?: number;
  customAttributes?: Record<string, any>;
}

export interface FeatureFlagOptions {
  defaultValue?: boolean;
  useLocalStorage?: boolean;
  localStorageTTL?: number; // milliseconds
}

class FeatureFlagManager {
  private static instance: FeatureFlagManager;
  private flags: Map<string, FeatureFlag> = new Map();
  private initializing: Promise<void> | null = null;
  private userContext: UserContext = {};
  private localOverrides: Map<string, boolean> = new Map();
  private realTimeSubscription: any = null;
  private readonly useLocalStorage: boolean = true;
  private readonly localStorageTTL: number = 60 * 60 * 1000; // 1 hour

  private constructor() {}

  static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager();
    }
    return FeatureFlagManager.instance;
  }

  /**
   * Initialize the feature flag system
   * @param initialUserContext User context for feature flag evaluation
   */
  async initialize(initialUserContext: UserContext = {}): Promise<void> {
    // Only initialize once
    if (this.initializing) {
      return this.initializing;
    }

    this.userContext = initialUserContext;

    this.initializing = (async () => {
      // Try to load flags from local storage first for faster startup
      if (this.useLocalStorage) {
        this.loadFromLocalStorage();
      }

      try {
        // Fetch flags from the database
        await this.fetchFlags();
        
        // Subscribe to real-time updates
        this.subscribeToUpdates();
      } catch (error) {
        console.error('Failed to initialize feature flags:', error);
        // If we've loaded from localStorage, we can still function even if the fetch fails
        if (this.flags.size === 0) {
          throw error; // Re-throw if we have no flags at all
        }
      }
    })();

    return this.initializing;
  }

  /**
   * Check if a feature is enabled for the current user context
   * @param flagName Name of the feature flag
   * @param options Options for flag evaluation
   * @param userContext Optional user context to override the default
   * @returns Whether the feature is enabled
   */
  isEnabled(
    flagName: string, 
    options: FeatureFlagOptions = {},
    userContext?: UserContext
  ): boolean {
    // Check for local override first (useful for development)
    if (this.localOverrides.has(flagName)) {
      return this.localOverrides.get(flagName)!;
    }

    const flag = this.flags.get(flagName);
    if (!flag) {
      console.warn(`Feature flag "${flagName}" not found`);
      return options.defaultValue || false;
    }

    // If flag is globally disabled, return false immediately
    if (!flag.is_enabled) {
      return false;
    }

    const context = userContext || this.userContext;

    // Check targeting rules if they exist
    if (flag.targeting_rules && flag.targeting_rules.length > 0) {
      for (const rule of flag.targeting_rules) {
        if (this.evaluateTargetingRule(rule, context)) {
          return true;
        }
      }
    }

    // Check percentage rollout if specified
    if (typeof flag.user_percentage === 'number') {
      const userId = context.userId || 'anonymous';
      if (this.isUserInPercentage(userId, flagName, flag.user_percentage)) {
        return true;
      }
      return false;
    }

    // If no targeting rules or percentage, the flag is enabled for everyone
    return true;
  }

  /**
   * Get the variant of a feature for the current user context
   * @param flagName Name of the feature flag
   * @param defaultVariant Default variant to return if flag not found
   * @param userContext Optional user context to override the default
   * @returns The assigned variant name
   */
  getVariant(
    flagName: string,
    defaultVariant: string = 'control',
    userContext?: UserContext
  ): string {
    const flag = this.flags.get(flagName);
    if (!flag || !flag.is_enabled || !flag.variant_distribution) {
      return defaultVariant;
    }

    const context = userContext || this.userContext;
    const userId = context.userId || 'anonymous';

    // If the flag has variants, determine which variant the user falls into
    const variants = flag.variant_distribution;
    if (variants.length === 0) {
      return defaultVariant;
    }

    // Hash the user ID + flag name to get a consistent random value
    const hash = this.hashString(`${userId}:${flagName}`);
    let percentile = hash % 100;

    // Find which variant bucket the user falls into
    let cumulativePercentage = 0;
    for (const variant of variants) {
      cumulativePercentage += variant.percentage;
      if (percentile < cumulativePercentage) {
        return variant.variant_name;
      }
    }

    return defaultVariant;
  }

  /**
   * Get variant payload if available
   * @param flagName Name of the feature flag
   * @param variantName Name of the variant
   * @returns The payload for the variant or undefined
   */
  getVariantPayload(flagName: string, variantName: string): any {
    const flag = this.flags.get(flagName);
    if (!flag || !flag.variant_distribution) {
      return undefined;
    }

    const variant = flag.variant_distribution.find(v => v.variant_name === variantName);
    return variant?.payload;
  }

  /**
   * Update the user context for feature flag evaluation
   * @param context New user context (will be merged with existing)
   */
  updateUserContext(context: UserContext): void {
    this.userContext = { ...this.userContext, ...context };
  }

  /**
   * Set a local override for a feature flag (useful for development)
   * @param flagName Name of the feature flag
   * @param value Override value
   */
  setLocalOverride(flagName: string, value: boolean): void {
    this.localOverrides.set(flagName, value);
    console.log(`Local override set for "${flagName}": ${value}`);
  }

  /**
   * Clear a local override for a feature flag
   * @param flagName Name of the feature flag
   */
  clearLocalOverride(flagName: string): void {
    this.localOverrides.delete(flagName);
    console.log(`Local override cleared for "${flagName}"`);
  }

  /**
   * Clear all local overrides
   */
  clearAllLocalOverrides(): void {
    this.localOverrides.clear();
    console.log('All local overrides cleared');
  }

  /**
   * Get all feature flags
   * @returns All feature flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Fetch feature flags from the database
   * @private
   */
  private async fetchFlags(): Promise<void> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('feature_flags')
        .select('*');

      if (error) {
        throw error;
      }

      if (data) {
        // Clear existing flags and load new ones
        this.flags.clear();
        data.forEach((flag: FeatureFlag) => {
          this.flags.set(flag.name, flag);
        });

        console.log(`Loaded ${data.length} feature flags`);

        // Store in localStorage if enabled
        if (this.useLocalStorage) {
          this.saveToLocalStorage();
        }
      }
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates for feature flags
   * @private
   */
  private subscribeToUpdates(): void {
    if (this.realTimeSubscription) {
      this.realTimeSubscription.unsubscribe();
    }

    this.realTimeSubscription = getSupabaseClient()
      .channel('feature_flags_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feature_flags' },
        (payload: any) => {
          console.log('Feature flag update received:', payload);
          // Refresh flags on any change
          this.fetchFlags();
        }
      )
      .subscribe();
  }

  /**
   * Save feature flags to local storage
   * @private
   */
  private saveToLocalStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const flags = Array.from(this.flags.values());
      const data = {
        flags,
        timestamp: Date.now(),
        expiry: Date.now() + this.localStorageTTL
      };
      localStorage.setItem('celora_feature_flags', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving feature flags to local storage:', error);
    }
  }

  /**
   * Load feature flags from local storage
   * @private
   */
  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = localStorage.getItem('celora_feature_flags');
      if (data) {
        const parsed = JSON.parse(data);
        
        // Check if the data is expired
        if (parsed.expiry && parsed.expiry > Date.now()) {
          parsed.flags.forEach((flag: FeatureFlag) => {
            this.flags.set(flag.name, flag);
          });
          console.log(`Loaded ${parsed.flags.length} feature flags from local storage`);
        } else {
          console.log('Feature flags in local storage have expired');
          localStorage.removeItem('celora_feature_flags');
        }
      }
    } catch (error) {
      console.error('Error loading feature flags from local storage:', error);
    }
  }

  /**
   * Evaluate a targeting rule against the user context
   * @param rule Targeting rule to evaluate
   * @param context User context
   * @returns Whether the rule matches
   * @private
   */
  private evaluateTargetingRule(rule: TargetingRule, context: UserContext): boolean {
    // Get the attribute value from the context
    let attributeValue: any = null;
    
    if (rule.attribute.includes('.')) {
      // Handle nested attributes (e.g., customAttributes.plan)
      const parts = rule.attribute.split('.');
      let obj = context as any;
      for (const part of parts) {
        if (obj === undefined || obj === null) return false;
        obj = obj[part];
      }
      attributeValue = obj;
    } else {
      // Handle top-level attributes
      attributeValue = (context as any)[rule.attribute];
    }

    // If attribute doesn't exist in context, rule doesn't match
    if (attributeValue === undefined) {
      return false;
    }

    // Evaluate the rule based on the operator
    switch (rule.operator) {
      case 'equals':
        return attributeValue === rule.value;
      case 'not_equals':
        return attributeValue !== rule.value;
      case 'contains':
        return typeof attributeValue === 'string' && 
               attributeValue.includes(rule.value as string);
      case 'not_contains':
        return typeof attributeValue === 'string' && 
               !attributeValue.includes(rule.value as string);
      case 'greater_than':
        return typeof attributeValue === 'number' && 
               attributeValue > (rule.value as number);
      case 'less_than':
        return typeof attributeValue === 'number' && 
               attributeValue < (rule.value as number);
      case 'in':
        return Array.isArray(rule.value) && 
               rule.value.includes(attributeValue);
      case 'not_in':
        return Array.isArray(rule.value) && 
               !rule.value.includes(attributeValue);
      default:
        return false;
    }
  }

  /**
   * Check if a user falls into a percentage bucket
   * @param userId User ID
   * @param flagName Feature flag name
   * @param percentage Percentage (0-100)
   * @returns Whether the user is in the percentage
   * @private
   */
  private isUserInPercentage(userId: string, flagName: string, percentage: number): boolean {
    // Use a hash of the user ID + flag name to get a consistent value
    const hash = this.hashString(`${userId}:${flagName}`);
    const bucket = hash % 100;
    return bucket < percentage;
  }

  /**
   * Simple string hash function
   * @param str String to hash
   * @returns Hash value
   * @private
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Clean up resources when the manager is no longer needed
   */
  cleanup(): void {
    if (this.realTimeSubscription) {
      this.realTimeSubscription.unsubscribe();
      this.realTimeSubscription = null;
    }
  }
}

// Export singleton instance
export const featureFlags = FeatureFlagManager.getInstance();

// Export a React hook for using feature flags
export function useFeatureFlag(
  flagName: string, 
  options: FeatureFlagOptions = {}
): boolean {
  if (typeof window === 'undefined') {
    return options.defaultValue || false;
  }
  
  return featureFlags.isEnabled(flagName, options);
}

// Export a React hook for using feature flag variants
export function useFeatureFlagVariant(
  flagName: string,
  defaultVariant: string = 'control'
): string {
  if (typeof window === 'undefined') {
    return defaultVariant;
  }
  
  return featureFlags.getVariant(flagName, defaultVariant);
}