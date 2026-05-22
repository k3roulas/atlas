import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Atlas',
  description: 'Privacy-first location intelligence platform',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started' },
      {
        text: 'API Reference',
        items: [
          { text: 'Authentication', link: '/api/authentication' },
          { text: 'Localities', link: '/api/localities' },
          { text: 'Stores', link: '/api/stores' },
          { text: 'Map', link: '/api/map' },
          { text: 'Geolocation', link: '/api/geolocation' },
        ],
      },
      { text: 'SDK', link: '/sdk/installation' },
      {
        text: 'Widgets',
        items: [
          { text: 'Autocomplete', link: '/widgets/autocomplete' },
          { text: 'Store Locator', link: '/widgets/store-locator' },
        ],
      },
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [{ text: 'Quickstart', link: '/getting-started' }],
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Authentication', link: '/api/authentication' },
          { text: 'Localities', link: '/api/localities' },
          { text: 'Stores', link: '/api/stores' },
          { text: 'Map', link: '/api/map' },
          { text: 'Geolocation', link: '/api/geolocation' },
        ],
      },
      {
        text: 'SDK',
        items: [
          { text: 'Installation', link: '/sdk/installation' },
          { text: 'Usage', link: '/sdk/usage' },
        ],
      },
      {
        text: 'Widgets',
        items: [
          { text: 'Autocomplete', link: '/widgets/autocomplete' },
          { text: 'Store Locator', link: '/widgets/store-locator' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/atlas' }],
    search: {
      provider: 'local',
    },
  },
});
