import { Schema, CanvasSettings } from '../types';

const SCHEMA_STORAGE_KEY = 'quickdb_diagram_schema_v2';
const SETTINGS_STORAGE_KEY = 'quickdb_diagram_canvas_settings_v2';
const COOKIE_FLAG_KEY = 'quickdb_autosave_active';

/**
 * Helper to write a browser cookie
 */
function setCookie(name: string, value: string, days = 365) {
  try {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `; expires=${date.toUTCString()}`;
    document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
  } catch (err) {
    console.warn('Cookie set error:', err);
  }
}

/**
 * Helper to get a browser cookie
 */
function getCookie(name: string): string | null {
  try {
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  } catch (err) {
    console.warn('Cookie get error:', err);
  }
  return null;
}

/**
 * Saves diagram schema to localStorage and sets cookie flag
 */
export function saveSchemaToStorage(schema: Schema): boolean {
  try {
    const serialized = JSON.stringify(schema);
    localStorage.setItem(SCHEMA_STORAGE_KEY, serialized);
    // Write cookie flag and last saved timestamp
    setCookie(COOKIE_FLAG_KEY, 'true');
    setCookie('quickdb_last_saved', String(Date.now()));
    setCookie('quickdb_tables_count', String(schema.tables?.length || 0));
    return true;
  } catch (err) {
    console.error('Failed to save diagram schema to local storage:', err);
    return false;
  }
}

/**
 * Loads diagram schema from localStorage, validating structure
 */
export function loadSchemaFromStorage(): Schema | null {
  try {
    const item = localStorage.getItem(SCHEMA_STORAGE_KEY);
    if (!item) return null;
    const parsed = JSON.parse(item);
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.tables)) {
      return parsed as Schema;
    }
  } catch (err) {
    console.error('Failed to load diagram schema from local storage:', err);
  }
  return null;
}

/**
 * Saves canvas settings to storage
 */
export function saveCanvasSettingsToStorage(settings: CanvasSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save canvas settings:', err);
  }
}

/**
 * Loads canvas settings from storage
 */
export function loadCanvasSettingsFromStorage(): CanvasSettings | null {
  try {
    const item = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!item) return null;
    return JSON.parse(item) as CanvasSettings;
  } catch (err) {
    console.error('Failed to load canvas settings:', err);
    return null;
  }
}

/**
 * Clears stored schema and cookies
 */
export function clearDiagramStorage(): void {
  try {
    localStorage.removeItem(SCHEMA_STORAGE_KEY);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    setCookie(COOKIE_FLAG_KEY, '', -1);
    setCookie('quickdb_last_saved', '', -1);
    setCookie('quickdb_tables_count', '', -1);
  } catch (err) {
    console.error('Failed to clear storage:', err);
  }
}

export function isAutosaveAvailable(): boolean {
  try {
    const testKey = '__test_storage__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}
