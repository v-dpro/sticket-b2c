// ONBOARDING · SET CITY — legacy route kept as a redirect (A2). City is no
// longer a dedicated blocking screen: it folds into the presale radar as an
// inline confirm chip + picker sheet (components/onboarding/CityConfirmChip).
// Redirecting to "/" re-runs the app/index gate, which places the user at
// the correct step of the 3-step lane.

import { Redirect } from 'expo-router';

export default function SetCityRedirect() {
  return <Redirect href="/" />;
}
