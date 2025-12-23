import React from 'react';

// Design System Components
import { SticketButton } from './components/SticketButton';
import { SticketCard } from './components/SticketCard';
import { SticketInput } from './components/SticketInput';
import { SticketBadge } from './components/SticketBadge';
import { SticketProgress } from './components/SticketProgress';

// Onboarding & Auth
import { WelcomeScreen } from './components/WelcomeScreen';
import { SetCityScreen } from './components/SetCityScreen';
import { ConnectSpotifyScreen } from './components/ConnectSpotifyScreen';
import { SelectArtistsScreen } from './components/onboarding/SelectArtistsScreen';
import { PresalePreviewScreen } from './components/onboarding/PresalePreviewScreen';
import { FindFriendsOnboardingScreen } from './components/FindFriendsOnboardingScreen';
import { LoginScreen } from './components/LoginScreen';
import { SignUpScreen } from './components/SignUpScreen';
import { ForgotPasswordScreen } from './components/ForgotPasswordScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';

// Main Screens
import { DiscoveryScreen } from './components/DiscoveryScreen';
import { SearchScreen } from './components/SearchScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { WalletScreen } from './components/WalletScreen';
import { FeedScreen } from './components/FeedScreen';
import { TabBar } from './components/navigation/TabBar';

// Detail Screens
import { EventDetailScreen } from './components/EventDetailScreen';
import { ArtistScreen } from './components/ArtistScreen';
import { VenueScreen } from './components/VenueScreen';
import { LogDetailScreen } from './components/LogDetailScreen';

// Log Flow
import { LogShowScreen } from './components/LogShowScreen';
import { CelebrationScreen } from './components/CelebrationScreen';

// Wallet Screens
import { TicketDetailScreen } from './components/TicketDetailScreen';
import { AddTicketScreen } from './components/AddTicketScreen';

// Social & Comments
import { CommentsScreen } from './components/CommentsScreen';

// Notifications
import { NotificationsScreen } from './components/NotificationsScreen';
import { NotificationSettingsScreen } from './components/NotificationSettingsScreen';

// Settings & Badges
import { SettingsScreen } from './components/SettingsScreen';
import { BadgesScreen } from './components/BadgesScreen';

// Empty State
import { EmptyState } from './components/EmptyState';

// New Restructure Screens
import { MyConcertLifeScreen } from './components/concert-life/MyConcertLifeScreen';
import { MyArtistsScreen } from './components/artists/MyArtistsScreen';
import { ConcertLogDetailScreen } from './components/concert-life/ConcertLogDetailScreen';

type ScreenName =
  | 'welcome'
  | 'set-city'
  | 'connect-spotify'
  | 'select-artists'
  | 'presale-preview'
  | 'find-friends-onboarding'
  | 'login'
  | 'signup'
  | 'forgot-password'
  | 'reset-password'
  | 'discovery'
  | 'search'
  | 'profile'
  | 'wallet'
  | 'feed'
  | 'concert-life'
  | 'concert-log-detail'
  | 'my-artists'
  | 'event-detail'
  | 'artist'
  | 'venue'
  | 'log-detail'
  | 'log-show'
  | 'celebration'
  | 'ticket-detail'
  | 'add-ticket'
  | 'comments'
  | 'notifications'
  | 'notification-settings'
  | 'settings'
  | 'badges'
  | 'tab-navigation'
  | 'design-system';

const screens: { name: ScreenName; label: string; category: string }[] = [
  // Onboarding
  { name: 'welcome', label: 'Welcome', category: 'Onboarding' },
  { name: 'set-city', label: 'Set City', category: 'Onboarding' },
  { name: 'connect-spotify', label: 'Connect Spotify', category: 'Onboarding' },
  { name: 'select-artists', label: 'Select Artists', category: 'Onboarding' },
  { name: 'presale-preview', label: 'Presale Preview', category: 'Onboarding' },
  { name: 'find-friends-onboarding', label: 'Find Friends', category: 'Onboarding' },
  
  // Auth
  { name: 'login', label: 'Login', category: 'Auth' },
  { name: 'signup', label: 'Sign Up', category: 'Auth' },
  { name: 'forgot-password', label: 'Forgot Password', category: 'Auth' },
  { name: 'reset-password', label: 'Reset Password', category: 'Auth' },
  
  // Main Tabs
  { name: 'tab-navigation', label: 'Tab Navigation', category: 'Main' },
  { name: 'discovery', label: 'Discovery (Home)', category: 'Main' },
  { name: 'search', label: 'Search', category: 'Main' },
  { name: 'feed', label: 'Feed', category: 'Main' },
  { name: 'concert-life', label: 'My Concert Life', category: 'Main' },
  { name: 'concert-log-detail', label: 'Concert Log Detail', category: 'Main' },
  { name: 'my-artists', label: 'My Artists', category: 'Main' },
  { name: 'wallet', label: 'Wallet', category: 'Main' },
  { name: 'profile', label: 'Profile', category: 'Main' },
  
  // Detail Pages
  { name: 'event-detail', label: 'Event Detail', category: 'Details' },
  { name: 'artist', label: 'Artist Page', category: 'Details' },
  { name: 'venue', label: 'Venue Page', category: 'Details' },
  { name: 'log-detail', label: 'Log Detail', category: 'Details' },
  
  // Log Flow
  { name: 'log-show', label: 'Log a Show', category: 'Log Flow' },
  { name: 'celebration', label: 'Celebration', category: 'Log Flow' },
  
  // Wallet
  { name: 'ticket-detail', label: 'Ticket Detail', category: 'Wallet' },
  { name: 'add-ticket', label: 'Add Ticket', category: 'Wallet' },
  
  // Social
  { name: 'comments', label: 'Comments', category: 'Social' },
  { name: 'notifications', label: 'Notifications', category: 'Social' },
  { name: 'notification-settings', label: 'Notification Settings', category: 'Social' },
  
  // Settings & Badges
  { name: 'settings', label: 'Settings', category: 'Settings' },
  { name: 'badges', label: 'Badges', category: 'Settings' },
  
  // Design System
  { name: 'design-system', label: 'Design System', category: 'Components' },
];

export default function App() {
  const [currentScreen, setCurrentScreen] = React.useState<ScreenName>('discovery');
  const [showSelector, setShowSelector] = React.useState(true);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return <WelcomeScreen />;
      case 'set-city':
        return <SetCityScreen />;
      case 'connect-spotify':
        return <ConnectSpotifyScreen />;
      case 'select-artists':
        return <SelectArtistsScreen />;
      case 'presale-preview':
        return <PresalePreviewScreen />;
      case 'find-friends-onboarding':
        return <FindFriendsOnboardingScreen />;
      case 'login':
        return <LoginScreen />;
      case 'signup':
        return <SignUpScreen />;
      case 'forgot-password':
        return <ForgotPasswordScreen />;
      case 'reset-password':
        return <ResetPasswordScreen />;
      case 'discovery':
        return <DiscoveryScreen />;
      case 'search':
        return <SearchScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'wallet':
        return <WalletScreen />;
      case 'feed':
        return <FeedScreen />;
      case 'concert-life':
        return <MyConcertLifeScreen />;
      case 'concert-log-detail':
        return <ConcertLogDetailScreen />;
      case 'my-artists':
        return <MyArtistsScreen />;
      case 'event-detail':
        return <EventDetailScreen />;
      case 'artist':
        return <ArtistScreen />;
      case 'venue':
        return <VenueScreen />;
      case 'log-detail':
        return <LogDetailScreen />;
      case 'log-show':
        return <LogShowScreen />;
      case 'celebration':
        return <CelebrationScreen />;
      case 'ticket-detail':
        return <TicketDetailScreen />;
      case 'add-ticket':
        return <AddTicketScreen />;
      case 'comments':
        return <CommentsScreen />;
      case 'notifications':
        return <NotificationsScreen />;
      case 'notification-settings':
        return <NotificationSettingsScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'badges':
        return <BadgesScreen />;
      case 'tab-navigation':
        return <TabNavigationDemo />;
      case 'design-system':
        return <DesignSystemShowcase />;
      default:
        return <DiscoveryScreen />;
    }
  };

  const categories = Array.from(new Set(screens.map((s) => s.category)));

  return (
    <div className="min-h-screen bg-[#0A0B1E] flex items-start justify-center p-8 gap-8">
      {/* Screen Selector */}
      {showSelector && (
        <div className="w-80 bg-[#12132D] rounded-2xl p-6 sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-[20px] font-bold">Sticket Screens</h2>
            <button
              onClick={() => setShowSelector(false)}
              className="text-[#6B6B8D] hover:text-white text-[24px]"
            >
              ×
            </button>
          </div>
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="text-[#6B6B8D] text-[11px] font-semibold uppercase tracking-wide mb-2">
                  {category}
                </h3>
                <div className="space-y-1">
                  {screens
                    .filter((s) => s.category === category)
                    .map((screen) => (
                      <button
                        key={screen.name}
                        onClick={() => setCurrentScreen(screen.name)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[14px] transition-colors ${
                          currentScreen === screen.name
                            ? 'bg-[#8B5CF6] text-white font-semibold'
                            : 'text-[#A1A1C7] hover:bg-[#1A1B3D] hover:text-white'
                        }`}
                      >
                        {screen.label}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-[#2A2B4D]">
            <p className="text-[#6B6B8D] text-[12px] text-center">
              {screens.length} screens built
            </p>
          </div>
        </div>
      )}

      {/* Screen Display */}
      <div className="relative">
        {!showSelector && (
          <button
            onClick={() => setShowSelector(true)}
            className="absolute -left-16 top-0 w-12 h-12 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center shadow-lg"
          >
            ☰
          </button>
        )}
        {renderScreen()}
      </div>
    </div>
  );
}

function DesignSystemShowcase() {
  return (
    <div className="w-[390px] bg-[#0A0B1E] p-6 space-y-6">
      <div>
        <h2 className="text-white text-[20px] font-bold mb-4">Buttons</h2>
        <div className="space-y-3">
          <SticketButton variant="primary">Primary Button</SticketButton>
          <SticketButton variant="secondary">Secondary Button</SticketButton>
          <SticketButton variant="ghost">Ghost Button</SticketButton>
        </div>
      </div>

      <div>
        <h2 className="text-white text-[20px] font-bold mb-4">Cards</h2>
        <SticketCard
          title="Event Card"
          subtitle="SoFi Stadium • Dec 15, 2024"
          image="https://images.unsplash.com/photo-1611939341783-a44f2cbd3bbd?w=400"
        />
      </div>

      <div>
        <h2 className="text-white text-[20px] font-bold mb-4">Input</h2>
        <SticketInput placeholder="Search artists..." />
      </div>

      <div>
        <h2 className="text-white text-[20px] font-bold mb-4">Badges</h2>
        <div className="flex gap-2">
          <SticketBadge status="keeping">Keeping</SticketBadge>
          <SticketBadge status="selling">Selling</SticketBadge>
        </div>
      </div>

      <div>
        <h2 className="text-white text-[20px] font-bold mb-4">Progress</h2>
        <SticketProgress current={7} total={10} label="7 of 10 shows" />
      </div>
    </div>
  );
}

function TabNavigationDemo() {
  const [activeTab, setActiveTab] = React.useState<'feed' | 'life' | 'artists' | 'profile'>('feed');

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-white text-[24px] font-bold mb-2">
            Tab Navigation Demo
          </h2>
          <p className="text-[#A0A0B8] text-[15px]">
            Current tab: <span className="text-[#00D4FF] font-bold">{activeTab}</span>
          </p>
        </div>
      </div>
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasShowToday={true}
      />
    </div>
  );
}