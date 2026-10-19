/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#f4eddf',
    tint: '#dfb866',
    background: '#0b241c',
    foreground: '#f4eddf',
    card: '#fff8e9',
    cardForeground: '#202820',
    primary: '#dfb866',
    primaryForeground: '#1a261e',
    secondary: '#18382c',
    secondaryForeground: '#f4eddf',
    muted: '#102d23',
    mutedForeground: '#a6b7aa',
    accent: '#7d2938',
    accentForeground: '#fff4e8',
    destructive: '#d45b59',
    destructiveForeground: '#ffffff',
    border: '#315442',
    input: '#315442',
  },

  dark: {
    text: '#f4eddf',
    tint: '#dfb866',
    background: '#0b241c',
    foreground: '#f4eddf',
    card: '#fff8e9',
    cardForeground: '#202820',
    primary: '#dfb866',
    primaryForeground: '#1a261e',
    secondary: '#18382c',
    secondaryForeground: '#f4eddf',
    muted: '#102d23',
    mutedForeground: '#a6b7aa',
    accent: '#7d2938',
    accentForeground: '#fff4e8',
    destructive: '#d45b59',
    destructiveForeground: '#ffffff',
    border: '#315442',
    input: '#315442',
  },
  radius: 16,
};

export default colors;
