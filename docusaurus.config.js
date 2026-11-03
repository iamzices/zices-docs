// @ts-check

/** @type {import('@docusaurus/types').Config} */
export default {
  title: 'Zices',
  favicon: 'icon.png',
  url: 'https://docs.zices.com',
  baseUrl: '/',
  trailingSlash: false,
  onBrokenLinks: 'throw',
  stylesheets: ['https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap'],
  markdown: {hooks: {onBrokenMarkdownLinks: 'throw'}},
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {routeBasePath: '/', sidebarPath: './sidebars.js', sidebarCollapsed: false, breadcrumbs: false},
        blog: {blogTitle: 'Blog', blogDescription: 'Blog posts by Zices @iamzices.', blogSidebarCount: 0, showReadingTime: false, archiveBasePath: null},
        theme: {customCss: './src/css/custom.css'},
      }),
    ],
  ],
  plugins: [
    // Map each page URL to its header breadcrumbs for src/theme/Navbar/Logo.
    () => ({
      name: 'zices-crumbs',
      async allContentLoaded({allContent, actions}) {
        const crumbs = {'/blog': [{label: 'Blog'}]};
        for (const {docs, sidebars} of allContent['docusaurus-plugin-content-docs'].default.loadedVersions) {
          const byId = Object.fromEntries(docs.map((doc) => [doc.id, doc]));
          for (const [library, items] of Object.entries(sidebars)) {
            const first = byId[items.find((item) => item.type === 'doc').id];
            for (const doc of docs.filter((doc) => doc.sidebar === library)) {
              crumbs[doc.permalink] = [{label: library, to: first.permalink}, {label: doc.title}];
            }
          }
        }
        for (const {metadata} of allContent['docusaurus-plugin-content-blog'].default.blogPosts) {
          crumbs[metadata.permalink] = [{label: 'Blog', to: '/blog'}, {label: metadata.title}];
        }
        actions.setGlobalData(crumbs);
      },
    }),
  ],
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
    colorMode: {defaultMode: 'light', respectPrefersColorScheme: false},
    // Mirror GitHub Dark; code blocks stay dark in both color modes.
    prism: {
      theme: {
        plain: {color: '#c9d1d9', backgroundColor: '#0d1117'},
        styles: [
          {types: ['comment', 'prolog', 'doctype', 'cdata'], style: {color: '#8b949e', fontStyle: 'italic'}},
          {types: ['keyword', 'operator', 'important', 'atrule'], style: {color: '#ff7b72'}},
          {types: ['string', 'char', 'attr-value', 'regex', 'url'], style: {color: '#a5d6ff'}},
          {types: ['function', 'class-name'], style: {color: '#d2a8ff'}},
          {types: ['number', 'boolean', 'constant', 'property', 'tag', 'builtin'], style: {color: '#79c0ff'}},
          {types: ['variable', 'parameter', 'attr-name'], style: {color: '#ffa657'}},
          {types: ['punctuation'], style: {color: '#c9d1d9'}},
        ],
      },
    },
    image: 'social-card.png',
    metadata: [{name: 'author', content: 'Zices (@iamzices)'}],
    navbar: {
      title: 'docs.zices.com',
      items: [
        // Mark Documentation active on / and /<library>/<page>, not the blog or 404.
        {to: '/', label: 'Documentation', position: 'right', activeBaseRegex: '^/($|(?!blog/)[^/]+/)'},
        {to: '/blog', label: 'Blog', position: 'right'},
        {href: 'https://github.com/iamzices', label: 'GitHub', position: 'right'},
      ],
    },
  },
};
