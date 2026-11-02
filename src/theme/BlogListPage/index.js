import Link from '@docusaurus/Link';
import {HtmlClassNameProvider, PageMetadata, ThemeClassNames} from '@docusaurus/theme-common';
import Layout from '@theme/Layout';
import BlogListPaginator from '@theme/BlogListPaginator';
import BlogListPageStructuredData from '@theme/BlogListPage/StructuredData';

// Format in UTC so server and browser dates match.
const monthFormat = new Intl.DateTimeFormat('en-US', {year: 'numeric', month: 'long', timeZone: 'UTC'});
const dayFormat = new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', timeZone: 'UTC'});

/**
 * Render the blog index as a timeline: posts grouped by month, each with its date and title.
 *
 * @param props - Props passed by the blog plugin.
 * @param props.metadata - The list page's metadata: title, description, and pagination.
 * @param props.items - The posts on this page, newest first.
 * @returns The blog index page.
 */
export default function BlogListPage(props) {
  const {metadata, items} = props;
  const months = Map.groupBy(
    items.map(({content}) => content.metadata),
    (post) => monthFormat.format(new Date(post.date)),
  );
  return (
    <HtmlClassNameProvider className={`${ThemeClassNames.wrapper.blogPages} ${ThemeClassNames.page.blogListPage}`}>
      <PageMetadata title={metadata.blogTitle} description={metadata.blogDescription} />
      <BlogListPageStructuredData {...props} />
      <Layout>
        <main className="container container--fluid margin-vert--lg">
          <article className="zices-blog-list">
            <h1>{metadata.blogTitle}</h1>
            {Array.from(months, ([month, posts]) => (
              <section key={month}>
                <h2 className="zices-timeline-month">{month}</h2>
                <ol className="zices-timeline">
                  {posts.map((post) => (
                    <li key={post.permalink}>
                      <time dateTime={post.date}>{dayFormat.format(new Date(post.date))}</time>
                      <Link to={post.permalink}>{post.title}</Link>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
            <BlogListPaginator metadata={metadata} />
          </article>
        </main>
      </Layout>
    </HtmlClassNameProvider>
  );
}
