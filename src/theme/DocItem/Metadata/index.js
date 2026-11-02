import {PageMetadata} from '@docusaurus/theme-common';
import {useDoc, useDocsSidebar} from '@docusaurus/plugin-content-docs/client';

/**
 * Render a docs page's metadata with the browser tab title "<page> | <library>".
 *
 * @returns The page metadata.
 */
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
