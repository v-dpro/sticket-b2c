import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface SettingToggle {
  id: string;
  label: string;
  enabled: boolean;
}

interface NotificationSettingsScreenProps {
  onBack?: () => void;
  onToggle?: (id: string, enabled: boolean) => void;
}

export function NotificationSettingsScreen({
  onBack,
  onToggle,
}: NotificationSettingsScreenProps) {
  const [socialSettings, setSocialSettings] = React.useState<SettingToggle[]>([
    { id: 'followers', label: 'New followers', enabled: true },
    { id: 'comments', label: 'Comments', enabled: true },
    { id: 'friendActivity', label: 'Friend activity', enabled: true },
    { id: 'tags', label: 'Tags', enabled: false },
  ]);

  const [showSettings, setShowSettings] = React.useState<SettingToggle[]>([
    { id: 'artistAnnouncements', label: 'Artist announcements', enabled: true },
    { id: 'ticketSales', label: 'Tickets on sale', enabled: true },
    { id: 'showReminders', label: 'Show reminders', enabled: true },
  ]);

  const [ticketSettings, setTicketSettings] = React.useState<SettingToggle[]>([
    { id: 'purchases', label: 'Purchase confirmations', enabled: true },
    { id: 'dayBefore', label: 'Day-before reminders', enabled: true },
  ]);

  const handleToggle = (
    section: 'social' | 'shows' | 'tickets',
    id: string
  ) => {
    const updateSettings = (settings: SettingToggle[]) =>
      settings.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      );

    if (section === 'social') {
      const updated = updateSettings(socialSettings);
      setSocialSettings(updated);
      const setting = updated.find((s) => s.id === id);
      onToggle?.(id, setting?.enabled || false);
    } else if (section === 'shows') {
      const updated = updateSettings(showSettings);
      setShowSettings(updated);
      const setting = updated.find((s) => s.id === id);
      onToggle?.(id, setting?.enabled || false);
    } else {
      const updated = updateSettings(ticketSettings);
      setTicketSettings(updated);
      const setting = updated.find((s) => s.id === id);
      onToggle?.(id, setting?.enabled || false);
    }
  };

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative w-12 h-7 rounded-full transition-colors ${
        enabled ? 'bg-[#8B5CF6]' : 'bg-[#2A2B4D]'
      }`}
    >
      <div
        className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
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
        <h1 className="text-white text-[28px] font-bold">
          Notification Settings
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Social Section */}
        <section className="mb-8">
          <h2 className="text-white text-[18px] font-bold mb-4">Social</h2>
          <div className="bg-[#12132D] rounded-xl overflow-hidden">
            {socialSettings.map((setting, index) => (
              <div
                key={setting.id}
                className={`px-4 py-4 flex items-center justify-between ${
                  index !== socialSettings.length - 1
                    ? 'border-b border-[#2A2B4D]'
                    : ''
                }`}
              >
                <span className="text-white text-[15px]">{setting.label}</span>
                <Toggle
                  enabled={setting.enabled}
                  onChange={() => handleToggle('social', setting.id)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Shows Section */}
        <section className="mb-8">
          <h2 className="text-white text-[18px] font-bold mb-4">Shows</h2>
          <div className="bg-[#12132D] rounded-xl overflow-hidden">
            {showSettings.map((setting, index) => (
              <div
                key={setting.id}
                className={`px-4 py-4 flex items-center justify-between ${
                  index !== showSettings.length - 1
                    ? 'border-b border-[#2A2B4D]'
                    : ''
                }`}
              >
                <span className="text-white text-[15px]">{setting.label}</span>
                <Toggle
                  enabled={setting.enabled}
                  onChange={() => handleToggle('shows', setting.id)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Tickets Section */}
        <section>
          <h2 className="text-white text-[18px] font-bold mb-4">Tickets</h2>
          <div className="bg-[#12132D] rounded-xl overflow-hidden">
            {ticketSettings.map((setting, index) => (
              <div
                key={setting.id}
                className={`px-4 py-4 flex items-center justify-between ${
                  index !== ticketSettings.length - 1
                    ? 'border-b border-[#2A2B4D]'
                    : ''
                }`}
              >
                <span className="text-white text-[15px]">{setting.label}</span>
                <Toggle
                  enabled={setting.enabled}
                  onChange={() => handleToggle('tickets', setting.id)}
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
