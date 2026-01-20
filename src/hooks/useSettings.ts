import { useState, useEffect } from 'react';
import { ViewMode } from '@/types/scheduler';

interface Settings {
  defaultViewMode: ViewMode;
}

const SETTINGS_KEY = 'scheduler-settings';

const defaultSettings: Settings = {
  defaultViewMode: 'shift',
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error('Failed to load settings', e);
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error('Failed to save settings', e);
      }
    }
  }, [settings]);

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return { settings, updateSettings };
}
