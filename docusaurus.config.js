// @ts-check

/** @type {import('@docusaurus/types').Config} */
export default {
  title: 'Zices',
  tagline: 'Docs for Zices projects.',
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
        docs: {routeBasePath: '/', sidebarPath: './sidebars.js', sidebarCollapsed: false},
        blog: false,
      }),
    ],
  ],
  // Tells search engines that every page belongs to Zices (@iamzices).
  headTags: [
    {
      tagName: 'script',
      attributes: {type: 'application/ld+json'},
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Zices',
        alternateName: '@iamzices',
        url: 'https://docs.zices.com',
        sameAs: ['https://github.com/iamzices'],
      }),
    },
  ],
  themeConfig: {
    metadata: [{name: 'author', content: 'Zices (@iamzices)'}],
    navbar: {
      logo: {alt: 'Zices documentation', src: 'zicesdocumentation.png'},
      items: [{href: 'https://github.com/iamzices', label: 'GitHub', position: 'right'}],
    },
  },
};
