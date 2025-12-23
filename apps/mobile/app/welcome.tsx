import { Redirect } from 'expo-router';

// Convenience route for web deep-links.
// We route to `/` so the main gate logic in `app/index.tsx` decides where to send the user.
export default function Welcome() {
  return <Redirect href="/" />;
}


