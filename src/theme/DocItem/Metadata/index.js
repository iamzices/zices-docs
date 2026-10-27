import React from 'react';
import {PageMetadata} from '@docusaurus/theme-common';
import {useDoc, useDocsSidebar} from '@docusaurus/plugin-content-docs/client';

// Browser tab title is "<page> | <library>", where the library is the sidebar key in sidebars.js.
// Titles that already name the library ("What is Chartable?") are left alone.
export default function DocItemMetadata() {
  const {metadata, frontMatter, assets} = useDoc();
  const library = useDocsSidebar().name;
  const title = metadata.title.includes(library) ? metadata.title : `${metadata.title} | ${library}`;
  return (
    <PageMetadata description={metadata.description} keywords={frontMatter.keywords} image={assets.image ?? frontMatter.image}>
      <title>{title}</title>
      <meta property="og:title" content={title} />
    </PageMetadata>
  );
}
