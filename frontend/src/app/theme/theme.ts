import { createTheme, type MantineThemeOverride } from '@mantine/core';


export const theme: MantineThemeOverride = createTheme({
  primaryColor: 'indigo',
  defaultRadius: 'md',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji',
  headings: {
    fontWeight: '600',
  },
  components: {
    Paper: {
      defaultProps: {
        shadow: 'none',
      },
    },
  },
});