export default {
  stories: [
    '../stories/**/*.mdx',
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: ['@storybook/addon-essentials', 'storybook-addon-rslib'],
  framework: 'storybook-react-rsbuild', // 例如 storybook-react-rsbuild
};