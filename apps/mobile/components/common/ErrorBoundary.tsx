import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { captureException } from '../../lib/errorTracking/sentry';
import { radius, spacing } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, errorInfo);
    captureException(error, { componentStack: errorInfo.componentStack });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return <ErrorFallback onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

// Functional fallback so the error UI can read active-theme tokens (a class
// component cannot call hooks).
function ErrorFallback({ onReset }: { onReset: () => void }) {
  const styles = useThemedStyles((t) => ({
    container: {
      flex: 1,
      backgroundColor: t.colors.ink,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
      gap: spacing.md,
    },
    title: {
      fontSize: 22,
      fontWeight: '900',
      color: t.colors.textHi,
      textAlign: 'center',
    },
    message: {
      fontSize: 14,
      fontWeight: '600',
      color: t.colors.textLo,
      textAlign: 'center',
    },
    button: {
      marginTop: spacing.sm,
      backgroundColor: t.colors.brandPurple,
      paddingHorizontal: spacing.xl,
      paddingVertical: 14,
      borderRadius: radius.md,
    },
    buttonText: {
      color: t.colors.onAccent, // text over the brandPurple button fill
      fontWeight: '800',
      fontSize: 15,
    },
  }));
  const { tokens } = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons name="warning" size={56} color={tokens.colors.error} />
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>We’ve been notified and are working on a fix.</Text>
      <Pressable style={styles.button} onPress={onReset} accessibilityRole="button">
        <Text style={styles.buttonText}>Try Again</Text>
      </Pressable>
    </View>
  );
}



