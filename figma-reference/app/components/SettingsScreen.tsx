import React from 'react';
import { ArrowLeft, ChevronRight, LogOut, Trash2 } from 'lucide-react';

interface SettingsScreenProps {
  onBack?: () => void;
  onNavigate?: (screen: string) => void;
  onLogout?: () => void;
  onDeleteAccount?: () => void;
}

export function SettingsScreen({
  onBack,
  onNavigate,
  onLogout,
  onDeleteAccount,
}: SettingsScreenProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  const MenuItem = ({
    label,
    value,
    onClick,
  }: {
    label: string;
    value?: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="w-full px-4 py-4 flex items-center justify-between hover:bg-[#1A1B3D] transition-colors"
    >
      <span className="text-white text-[15px]">{label}</span>
      <div className="flex items-center gap-2">
        {value && (
          <span className="text-[#6B6B8D] text-[14px]">{value}</span>
        )}
        <ChevronRight className="w-5 h-5 text-[#6B6B8D]" />
      </div>
    </button>
  );

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-[#A1A1C7] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[14px] font-medium">Back</span>
        </button>
        <h1 className="text-white text-[28px] font-bold">Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-6">
        {/* Account Section */}
        <section className="mb-6">
          <h2 className="px-6 text-[#6B6B8D] text-[13px] font-semibold uppercase tracking-wide mb-3">
            Account
          </h2>
          <div className="bg-[#12132D] divide-y divide-[#2A2B4D]">
            <MenuItem
              label="Edit Profile"
              onClick={() => onNavigate?.('edit-profile')}
            />
            <MenuItem
              label="Email"
              value="user@email.com"
              onClick={() => onNavigate?.('change-email')}
            />
            <MenuItem
              label="Password"
              value="••••••••"
              onClick={() => onNavigate?.('change-password')}
            />
          </div>
        </section>

        {/* Connected Services */}
        <section className="mb-6">
          <h2 className="px-6 text-[#6B6B8D] text-[13px] font-semibold uppercase tracking-wide mb-3">
            Connected Services
          </h2>
          <div className="bg-[#12132D] divide-y divide-[#2A2B4D]">
            <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-[#1A1B3D] transition-colors">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                <span className="text-white text-[15px]">Spotify</span>
              </div>
              <span className="text-[#22C55E] text-[13px] font-medium">Connected</span>
            </button>
            <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-[#1A1B3D] transition-colors">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#FA243C]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.997 6.124a2.999 2.999 0 0 0-2.997-3H3a3 3 0 0 0-3 3v11.75a3 3 0 0 0 3 3h18a2.999 2.999 0 0 0 2.997-3V6.124ZM6.285 8.997a3.242 3.242 0 0 1 3.239 3.238 3.242 3.242 0 0 1-3.24 3.238 3.242 3.242 0 0 1-3.238-3.238 3.242 3.242 0 0 1 3.239-3.238Zm10.498 7.776a4.444 4.444 0 0 1-4.44-4.44 4.444 4.444 0 0 1 4.44-4.439 4.444 4.444 0 0 1 4.439 4.44 4.444 4.444 0 0 1-4.44 4.44Z"/>
                </svg>
                <span className="text-white text-[15px]">Apple Music</span>
              </div>
              <span className="text-[#6B6B8D] text-[13px]">Connect</span>
            </button>
          </div>
        </section>

        {/* Preferences */}
        <section className="mb-6">
          <h2 className="px-6 text-[#6B6B8D] text-[13px] font-semibold uppercase tracking-wide mb-3">
            Preferences
          </h2>
          <div className="bg-[#12132D] divide-y divide-[#2A2B4D]">
            <MenuItem
              label="Privacy"
              onClick={() => onNavigate?.('privacy')}
            />
            <MenuItem
              label="Notifications"
              onClick={() => onNavigate?.('notifications')}
            />
            <MenuItem
              label="Home City"
              value="Los Angeles, CA"
              onClick={() => onNavigate?.('home-city')}
            />
            <MenuItem
              label="Distance Unit"
              value="Miles"
              onClick={() => onNavigate?.('distance-unit')}
            />
          </div>
        </section>

        {/* Data */}
        <section className="mb-6">
          <h2 className="px-6 text-[#6B6B8D] text-[13px] font-semibold uppercase tracking-wide mb-3">
            Data
          </h2>
          <div className="bg-[#12132D] divide-y divide-[#2A2B4D]">
            <MenuItem
              label="Export My Data"
              onClick={() => onNavigate?.('export-data')}
            />
            <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-[#1A1B3D] transition-colors">
              <span className="text-white text-[15px]">Clear Cache</span>
              <span className="text-[#6B6B8D] text-[14px]">24.5 MB</span>
            </button>
          </div>
        </section>

        {/* Support */}
        <section className="mb-6">
          <h2 className="px-6 text-[#6B6B8D] text-[13px] font-semibold uppercase tracking-wide mb-3">
            Support
          </h2>
          <div className="bg-[#12132D] divide-y divide-[#2A2B4D]">
            <MenuItem
              label="Help & FAQ"
              onClick={() => onNavigate?.('help')}
            />
            <MenuItem
              label="Report a Bug"
              onClick={() => onNavigate?.('report-bug')}
            />
            <MenuItem
              label="Rate Sticket"
              onClick={() => {}}
            />
          </div>
        </section>

        {/* Legal */}
        <section className="mb-6">
          <h2 className="px-6 text-[#6B6B8D] text-[13px] font-semibold uppercase tracking-wide mb-3">
            Legal
          </h2>
          <div className="bg-[#12132D] divide-y divide-[#2A2B4D]">
            <MenuItem
              label="Terms of Service"
              onClick={() => onNavigate?.('terms')}
            />
            <MenuItem
              label="Privacy Policy"
              onClick={() => onNavigate?.('privacy-policy')}
            />
          </div>
        </section>

        {/* Action Buttons */}
        <div className="px-6 space-y-3">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full py-4 rounded-xl bg-[#12132D] border border-[#2A2B4D] text-white font-semibold text-[15px] flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
          <button
            onClick={onDeleteAccount}
            className="w-full py-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] font-semibold text-[15px] flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Delete Account
          </button>
        </div>

        {/* App Version */}
        <p className="text-center text-[#6B6B8D] text-[13px] mt-6 mb-4">
          Version 1.0.0 (Build 100)
        </p>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-[#12132D] rounded-2xl p-6">
            <h3 className="text-white text-[20px] font-bold mb-3">
              Log out?
            </h3>
            <p className="text-[#A1A1C7] text-[15px] mb-6">
              Are you sure you want to log out of your account?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-[#1A1B3D] text-white font-semibold text-[15px]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout?.();
                }}
                className="flex-1 py-3 rounded-xl bg-[#EF4444] text-white font-semibold text-[15px]"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
