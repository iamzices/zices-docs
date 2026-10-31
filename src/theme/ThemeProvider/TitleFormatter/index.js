import React from 'react';
import {TitleFormatterProvider} from '@docusaurus/theme-common/internal';

// Titles that already name the site ("Projects by Zices") are left alone instead of becoming "<title> | Zices".
const formatter = (params) =>
  params.title?.includes(params.siteTitle) ? params.title.trim() : params.defaultFormatter(params);

export default function ThemeProviderTitleFormatter({children}) {
  return <TitleFormatterProvider formatter={formatter}>{children}</TitleFormatterProvider>;
}
