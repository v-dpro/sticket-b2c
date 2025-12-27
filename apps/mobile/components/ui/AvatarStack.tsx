import { View, Image, Text, StyleSheet } from 'react-native';
import { colors } from '../../lib/theme';

interface Avatar {
  uri: string | null;
  name: string;
}

interface Props {
  avatars: Avatar[];
  max?: number;
  size?: number;
}

export function AvatarStack({ avatars, max = 3, size = 24 }: Props) {
  const displayed = avatars.slice(0, max);
  const remaining = avatars.length - max;
  
  return (
    <View style={styles.container}>
      {displayed.map((avatar, index) => (
        <View 
          key={index} 
          style={[
            styles.avatarWrapper,
            { 
              width: size, 
              height: size,
              marginLeft: index === 0 ? 0 : -size / 3,
              zIndex: displayed.length - index,
            }
          ]}
        >
          {avatar.uri ? (
            <Image source={{ uri: avatar.uri }} style={styles.avatar} />
          ) : (
            <View style={[styles.placeholder, { width: size, height: size }]}>
              <Text style={[styles.placeholderText, { fontSize: Math.max(10, size * 0.4) }]}>
                {avatar.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      ))}
      {remaining > 0 && (
        <Text style={styles.remainingText}>+{remaining}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.textTertiary,
    fontWeight: '700',
  },
  remainingText: {
    marginLeft: 8,
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
  },
});

