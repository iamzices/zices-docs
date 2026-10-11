// @ts-check

/** @type {import('@docusaurus/types').Config} */
export default {
  title: 'Zices Docs',
  tagline: 'Docs for Zices Python libraries.',
  favicon: 'icon.png',
  url: 'https://docs.zices.com',
  baseUrl: '/',
  trailingSlash: false,
  onBrokenLinks: 'throw',
  markdown: {hooks: {onBrokenMarkdownLinks: 'throw'}},
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {routeBasePath: '/'},
        blog: false,
      }),
    ],
  ],
  themeConfig: {
    navbar: {
      logo: {alt: 'Zices', src: 'zices.png'},
      items: [{href: 'https://github.com/iamzices', label: 'GitHub', position: 'right'}],
    },
  },
};
