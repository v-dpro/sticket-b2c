// lib/theme-context.tsx — theme mode resolution + persistence.
//
// ThemeProvider resolves the active palette (darkTokens / lightTokens)
// from a persisted preference ('system' | 'dark' | 'light') and the OS
// color scheme, and exposes it via useTheme().
//
// No flash-of-wrong-theme: the persisted preference read starts at module
// import (before fonts finish loading), and the provider withholds its
// children until hydration completes. Since the root layout keeps the
// splash screen up until its children mount and fonts/session resolve,
// the first visible paint always uses the persisted mode.

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  StyleSheet,
  useColorScheme,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { darkTokens, lightTokens, type ThemeMode, type ThemeTokens } from './theme';

export type ThemePreference = 'system' | ThemeMode;

const STORAGE_KEY = 'sticket.theme-mode.v1';
const DEFAULT_PREFERENCE: ThemePreference = 'system';

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'dark' || value === 'light';
}

// Kick off the persisted read immediately at import time so it races ahead
// of font/session loading. Cached so the provider can hydrate synchronously
// on fast refresh / remount.
let cachedPreference: ThemePreference | null = null;
const preferencePromise: Promise<ThemePreference> = AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => (isThemePreference(raw) ? raw : DEFAULT_PREFERENCE))
  .catch(() => DEFAULT_PREFERENCE)
  .then((pref) => {
    cachedPreference = pref;
    return pref;
  });

export type ThemeContextValue = {
  /** Active palette tokens (dark or light). */
  tokens: ThemeTokens;
  /** User preference, possibly 'system'. */
  mode: ThemePreference;
  /** What is actually rendered after resolving 'system'. */
  resolvedMode: ThemeMode;
  /** Set + persist the preference. */
  setMode: (mode: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = { children: ReactNode };

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference | null>(cachedPreference);

  useEffect(() => {
    if (preference !== null) return;
    let alive = true;
    void preferencePromise.then((pref) => {
      if (alive) setPreference((current) => current ?? pref);
    });
    return () => {
      alive = false;
    };
  }, [preference]);

  const setMode = useCallback((mode: ThemePreference) => {
    cachedPreference = mode;
    setPreference(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {
      // persistence is best-effort; in-memory value still applies
    });
  }, []);

  const effectivePreference = preference ?? DEFAULT_PREFERENCE;
  const resolvedMode: ThemeMode =
    effectivePreference === 'system'
      ? systemScheme === 'light'
        ? 'light'
        : 'dark' // app default is dark when the OS reports null
      : effectivePreference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      tokens: resolvedMode === 'light' ? lightTokens : darkTokens,
      mode: effectivePreference,
      resolvedMode,
      setMode,
    }),
    [effectivePreference, resolvedMode, setMode],
  );

  // Withhold children until the persisted preference is known — the root
  // layout's splash screen stays up meanwhile, so nothing wrong-flashes.
  if (preference === null) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within <ThemeProvider> (see app/_layout.tsx)');
  }
  return ctx;
}

/**
 * Build a StyleSheet from the active theme tokens, memoized per palette.
 *
 *   const styles = useThemedStyles((t) => ({
 *     card: { backgroundColor: t.colors.card, borderRadius: t.radius.lg },
 *   }));
 *
 * `factory` must be pure (tokens in, styles out) — it is re-run only when
 * the resolved palette changes.
 */
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function useThemedStyles<T extends NamedStyles<T>>(
  factory: (tokens: ThemeTokens) => T,
): T {
  const { tokens } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- factory must be pure; keyed by palette
  return useMemo(() => StyleSheet.create(factory(tokens)), [tokens]);
}
