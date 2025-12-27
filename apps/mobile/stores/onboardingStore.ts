import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

interface SelectedArtist {
  spotifyId?: string;
  name: string;
  imageUrl?: string;
  genres?: string[];
  tier: 'top-tier' | 'following';
}

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  hasSeenWelcome: boolean;
  currentStep: number;
  city: string | null;
  spotifyConnected: boolean;
  spotifyStepCompleted: boolean;
  selectedArtists: SelectedArtist[];
  artistsStepCompleted: boolean;
  presalePreviewShown: boolean;
  firstShowLogged: boolean;
  notificationPermissionAsked: boolean;

  // Actions
  markWelcomeSeen: () => void;
  setCity: (city: string) => void;
  setSpotifyConnected: (connected: boolean) => void;
  setSelectedArtists: (artists: SelectedArtist[]) => void;
  markArtistsStepCompleted: () => Promise<void>;
  toggleArtistSelection: (artist: Omit<SelectedArtist, 'tier'>, isTopTier?: boolean) => void;
  markPresalePreviewShown: () => void;
  setFirstShowLogged: (logged: boolean) => void;
  setNotificationPermissionAsked: (asked: boolean) => void;
  completeOnboarding: () => Promise<void>;
  checkOnboardingStatus: () => Promise<boolean>;
  resetOnboarding: () => Promise<void>;
}

const STORAGE_KEY = 'sticket.onboarding.v2';

export const useOnboardingStore = create<OnboardingState>((set, get) => {
  const persistNow = async () => {
    const s = get();
    const payload = {
      hasCompletedOnboarding: s.hasCompletedOnboarding,
      hasSeenWelcome: s.hasSeenWelcome,
      currentStep: s.currentStep,
      city: s.city,
      spotifyConnected: s.spotifyConnected,
      spotifyStepCompleted: s.spotifyStepCompleted,
      selectedArtists: s.selectedArtists,
      artistsStepCompleted: s.artistsStepCompleted,
      presalePreviewShown: s.presalePreviewShown,
      firstShowLogged: s.firstShowLogged,
      notificationPermissionAsked: s.notificationPermissionAsked,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  return {
    hasCompletedOnboarding: false,
    hasSeenWelcome: false,
    currentStep: 0,
    city: null,
    spotifyConnected: false,
    spotifyStepCompleted: false,
    selectedArtists: [],
    artistsStepCompleted: false,
    presalePreviewShown: false,
    firstShowLogged: false,
    notificationPermissionAsked: false,

    markWelcomeSeen: () => {
      set({ hasSeenWelcome: true, currentStep: 0 });
      void persistNow();
    },

    setCity: (city) => {
      set({ city, currentStep: 1 });
      void persistNow();
    },

    setSpotifyConnected: (connected) => {
      set({ spotifyConnected: connected, spotifyStepCompleted: true, currentStep: 2 });
      void persistNow();
    },

    setSelectedArtists: (artists) => {
      set({ selectedArtists: artists, artistsStepCompleted: artists.length >= 3, currentStep: 3 });
      void persistNow();
    },

    markArtistsStepCompleted: async () => {
      set({ artistsStepCompleted: true, currentStep: 3 });
      await persistNow();
    },

    toggleArtistSelection: (artist, isTopTier = false) => {
      const current = get().selectedArtists;
      const existing = current.find(
        (a) => (a.spotifyId && a.spotifyId === artist.spotifyId) || a.name.toLowerCase() === artist.name.toLowerCase()
      );

      let updated: SelectedArtist[];
      if (existing) {
        // If already selected, toggle tier or remove
        if (isTopTier && existing.tier !== 'top-tier') {
          updated = current.map((a) => (a === existing ? { ...a, tier: 'top-tier' as const } : a));
        } else if (!isTopTier && existing.tier === 'top-tier') {
          updated = current.map((a) => (a === existing ? { ...a, tier: 'following' as const } : a));
        } else {
          // Remove
          updated = current.filter((a) => a !== existing);
        }
      } else {
        // Add new
        updated = [...current, { ...artist, tier: isTopTier ? 'top-tier' : 'following' }];
      }

      set({
        selectedArtists: updated,
        artistsStepCompleted: updated.length >= 3,
      });
      void persistNow();
    },

    markPresalePreviewShown: () => {
      set({ presalePreviewShown: true, currentStep: 4 });
      void persistNow();
    },

    setFirstShowLogged: (logged) => {
      set({ firstShowLogged: logged, currentStep: 5 });
      void persistNow();
    },

    setNotificationPermissionAsked: (asked) => {
      set({ notificationPermissionAsked: asked });
      void persistNow();
    },

    completeOnboarding: async () => {
      set({ hasCompletedOnboarding: true });
      await persistNow();
    },

    checkOnboardingStatus: async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      try {
        const parsed = JSON.parse(raw);
        set({
          hasCompletedOnboarding: Boolean(parsed.hasCompletedOnboarding),
          hasSeenWelcome: Boolean(parsed.hasSeenWelcome),
          currentStep: typeof parsed.currentStep === 'number' ? parsed.currentStep : 0,
          city: typeof parsed.city === 'string' ? parsed.city : null,
          spotifyConnected: Boolean(parsed.spotifyConnected),
          spotifyStepCompleted: Boolean(parsed.spotifyStepCompleted),
          selectedArtists: Array.isArray(parsed.selectedArtists) ? parsed.selectedArtists : [],
          artistsStepCompleted: Boolean(parsed.artistsStepCompleted),
          presalePreviewShown: Boolean(parsed.presalePreviewShown),
          firstShowLogged: Boolean(parsed.firstShowLogged),
          notificationPermissionAsked: Boolean(parsed.notificationPermissionAsked),
        });
        return Boolean(parsed.hasCompletedOnboarding);
      } catch {
        return false;
      }
    },

    resetOnboarding: async () => {
      await AsyncStorage.removeItem(STORAGE_KEY);
      set({
        hasCompletedOnboarding: false,
        hasSeenWelcome: false,
        currentStep: 0,
        city: null,
        spotifyConnected: false,
        spotifyStepCompleted: false,
        selectedArtists: [],
        artistsStepCompleted: false,
        presalePreviewShown: false,
        firstShowLogged: false,
        notificationPermissionAsked: false,
      });
    },
  };
});




