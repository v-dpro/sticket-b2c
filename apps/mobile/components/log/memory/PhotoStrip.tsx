// PhotoStrip — the horizontal add-grid for the PHOTOS card. Tiles upload as
// they're added (per-tile spinner), show a check when done, and a tap-to-retry
// state on failure. A trailing dashed "+" tile opens the picker until the max
// is reached. Overlays use image opacity + token-colored glyphs only (no
// static scrim color).

import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../lib/theme-context';
import { SpringPressable } from '../../ui/SpringPressable';

export type PhotoStatus = 'uploading' | 'done' | 'error';

export type PhotoItem = {
  /** Stable local key. */
  key: string;
  /** Local file uri (used for the preview and the upload). */
  uri: string;
  status: PhotoStatus;
  /** Server photo id, once uploaded. */
  remoteId?: string;
  mimeType?: string;
  fileName?: string;
};

const TILE = 84;

type PhotoStripProps = {
  photos: PhotoItem[];
  canAdd: boolean;
  onAdd: () => void;
  onRetry: (key: string) => void;
  onDismiss: (key: string) => void;
};

export function PhotoStrip({ photos, canAdd, onAdd, onRetry, onDismiss }: PhotoStripProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {photos.map((p) => (
        <View
          key={p.key}
          style={{
            width: TILE,
            height: TILE,
            borderRadius: tokens.radius.md,
            overflow: 'hidden',
            backgroundColor: c.card2,
          }}
        >
          <Image
            source={{ uri: p.uri }}
            style={{ width: '100%', height: '100%', opacity: p.status === 'done' ? 1 : 0.45 }}
          />

          {p.status === 'uploading' ? (
            <View style={[StyleSheet.absoluteFillObject, styles.center]}>
              <ActivityIndicator size="small" color={c.fg} />
            </View>
          ) : null}

          {p.status === 'error' ? (
            <SpringPressable
              onPress={() => onRetry(p.key)}
              haptic="light"
              accessibilityRole="button"
              accessibilityLabel="Retry upload"
              style={[StyleSheet.absoluteFillObject, styles.center, { gap: 2 }]}
            >
              <Ionicons name="refresh" size={22} color={c.fg} />
              <Text style={{ fontSize: 10, fontWeight: '600', color: c.fg }}>Retry</Text>
            </SpringPressable>
          ) : null}

          {p.status === 'done' ? (
            <View style={[styles.badge, { backgroundColor: c.inverseBg }]}>
              <Ionicons name="checkmark" size={13} color={c.inverseFg} />
            </View>
          ) : null}

          {p.status === 'error' ? (
            <SpringPressable
              onPress={() => onDismiss(p.key)}
              haptic="light"
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
              style={[styles.badge, { backgroundColor: c.inverseBg }]}
            >
              <Ionicons name="close" size={13} color={c.inverseFg} />
            </SpringPressable>
          ) : null}
        </View>
      ))}

      {canAdd ? (
        <SpringPressable
          onPress={onAdd}
          haptic="light"
          accessibilityRole="button"
          accessibilityLabel="Add photos"
          style={{
            width: TILE,
            height: TILE,
            borderRadius: tokens.radius.md,
            borderWidth: 1,
            borderColor: c.line,
            borderStyle: 'dashed',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.card2,
          }}
        >
          <Ionicons name="add" size={26} color={c.mute} />
        </SpringPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
