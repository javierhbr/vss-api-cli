import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'VSS-API-CLI Docs',
  tagline: 'CLI tool for scaffolding API projects with hexagonal architecture',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://your-username.github.io', // TODO: Replace with your GitHub username
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/vss-api-cli/', // GitHub Pages will serve the site under this path

  // GitHub pages deployment config.
  organizationName: 'your-username', // TODO: Replace with your GitHub username or organization
  projectName: 'vss-ol-cli', // Repository name
  trailingSlash: false,
  deploymentBranch: 'gh-pages', // The branch where GitHub Pages content will be deployed

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Set the docs section to be the root of the site
          routeBasePath: '/', 
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/your-username/vss-ol-cli/tree/main/doc/', // TODO: Update with your repo URL
        },
        // Disable the blog plugin
        blog: false, 
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      // Make the title link to the root (intro page)
      title: 'VSS-API-CLI', 
      logo: {
        alt: 'VSS-API-CLI Logo',
        src: 'img/logo.svg', // You might want to replace this
        // Remove the 'to' property to revert the link behavior
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar', // Keep this for now, relates to sidebars.ts
          position: 'left',
          label: 'Docs',
        },
        // Remove blog link from navbar
        // {to: '/blog', label: 'Blog', position: 'left'}, 
        {
          href: 'https://github.com/your-username/vss-ol-cli', // TODO: Update with your repo URL
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Introduction',
              // Link to root now, as docs are at the base path
              to: '/', 
            },
            {
              label: 'Architecture',
              to: '/architecture',
            },
            {
              label: 'Commands',
              to: '/commands/handler', // Link to the first command or category index
            },
          ],
        },
        // Add other footer links if needed
        {
          title: 'More',
          items: [
            // Remove blog link from footer
            // { label: 'Blog', to: '/blog', }, 
            {
              label: 'GitHub',
              href: 'https://github.com/your-username/vss-ol-cli', // TODO: Update with your repo URL
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} VSS-API-CLI Project. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
