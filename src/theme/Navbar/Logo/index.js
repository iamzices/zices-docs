import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import {usePluginData} from '@docusaurus/useGlobalData';
import Logo from '@theme-original/Navbar/Logo';

/**
 * Render the header title followed by the current page's breadcrumbs, as in "docs.zices.com / neo4j-guard / API reference".
 *
 * @returns The header title and breadcrumbs.
 */
export default function NavbarLogo() {
  const crumbs = usePluginData('zices-crumbs')[useLocation().pathname] ?? [];
  return (
    <nav className="zices-crumbs" aria-label="Breadcrumbs">
      <Logo />
      {crumbs.map(({label, to}) =>
        to ? (
          <Link key={label} className="zices-crumb" to={to}>{label}</Link>
        ) : (
          <span key={label} className="zices-crumb" aria-current="page">{label}</span>
        ),
      )}
    </nav>
  );
}
