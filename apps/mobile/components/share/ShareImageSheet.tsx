// ShareImageSheet — the memory-post "share as image" sheet (app/log/[id]).
// Two rows over the app's one BottomSheet shell: send the branded story card
// to Instagram (via the OS share sheet), or hand it to the generic
// Save / Share… sheet. A row shows a spinner while its capture is in flight so
// the share only fires once the PNG exists. This is UI (not a brand artifact),
// so it uses the live app theme tokens — unlike the dark-locked story card.

import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { BottomSheet } from '../ui/BottomSheet';

export type ShareImageMode = 'instagram' | 'image';

type ShareImageSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Which row is mid-capture (shows a spinner); null when idle. */
  busy: ShareImageMode | null;
  onSelect: (mode: ShareImageMode) => void;
};

export function ShareImageSheet({ visible, onClose, busy, onSelect }: ShareImageSheetProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;
  const styles = useThemedStyles(buildStyles);
  const anyBusy = busy !== null;

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Share this memory">
      <View style={styles.body}>
        <Text style={styles.title}>Share this memory</Text>

        <Row
          styles={styles}
          tint={c.fg}
          icon="logo-instagram"
          label="Share to Instagram"
          sublabel="Post it to your story or feed"
          busy={busy === 'instagram'}
          disabled={anyBusy}
          onPress={() => onSelect('instagram')}
        />
        <Row
          styles={styles}
          tint={c.fg}
          icon="download-outline"
          label="Save / Share image…"
          sublabel="Send anywhere or save to Photos"
          busy={busy === 'image'}
          disabled={anyBusy}
          onPress={() => onSelect('image')}
        />
      </View>
    </BottomSheet>
  );
}

function Row({
  styles,
  tint,
  icon,
  label,
  sublabel,
  busy,
  disabled,
  onPress,
}: {
  styles: ReturnType<typeof buildStyles>;
  tint: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.row, disabled && !busy ? styles.rowDim : null]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled }}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{sublabel}</Text>
      </View>
      {busy ? <ActivityIndicator size="small" color={tint} /> : null}
    </Pressable>
  );
}

const buildStyles = (tokens: ThemeTokens) => ({
  body: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: tokens.colors.fg,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.card2,
  },
  rowDim: {
    opacity: 0.5,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: tokens.colors.card,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: tokens.colors.fg,
  },
  rowSub: {
    fontSize: 12.5,
    fontWeight: '400' as const,
    color: tokens.colors.mute,
    marginTop: 2,
  },
});
