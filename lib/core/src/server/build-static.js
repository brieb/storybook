import webpack from 'webpack';
import path from 'path';
import fs from 'fs';
import shelljs from 'shelljs';
import { logger } from '@storybook/node-logger';
import { getProdCli } from './cli';
import loadConfig from './config';

const defaultFavIcon = require.resolve('./public/favicon.ico');

export function buildStaticStandalone(options) {
  const { outputDir, staticDir, watch } = options;

  // create output directory if not exists
  shelljs.mkdir('-p', path.resolve(outputDir));
  // clear the static dir
  shelljs.rm('-rf', path.resolve(outputDir, 'static'));
  shelljs.cp(defaultFavIcon, outputDir);

  // Build the webpack configuration using the `baseConfig`
  // custom `.babelrc` file and `webpack.config.js` files
  // NOTE changes to env should be done before calling `getBaseConfig`
  const config = loadConfig({
    configType: 'PRODUCTION',
    corePresets: [require.resolve('./core-preset-prod.js')],
    ...options,
  });

  config.output.path = path.resolve(outputDir);

  // copy all static files
  if (staticDir) {
    staticDir.forEach(dir => {
      if (!fs.existsSync(dir)) {
        logger.error(`Error: no such directory to load static files: ${dir}`);
        process.exit(-1);
      }
      logger.info(`=> Copying static files from: ${dir}`);
      shelljs.cp('-r', `${dir}/*`, outputDir);
    });
  }

  // compile all resources with webpack and write them to the disk.
  logger.info('Building storybook ...');
  const webpackCb = (err, stats) => {
    if (err || stats.hasErrors()) {
      logger.error('Failed to build the storybook');
      // eslint-disable-next-line no-unused-expressions
      err && logger.error(err.message);
      // eslint-disable-next-line no-unused-expressions
      stats && stats.hasErrors() && stats.toJson().errors.forEach(e => logger.error(e));
      process.exitCode = 1;
    }
    logger.info('Building storybook completed.');
  };

  const compiler = webpack(config);

  if (watch) {
    compiler.watch({}, webpackCb);
  } else {
    compiler.run(webpackCb);
  }
}

export function buildStatic({ packageJson, ...loadOptions }) {
  const cliOptions = getProdCli(packageJson);

  buildStaticStandalone({
    ...cliOptions,
    ...loadOptions,
    configDir: cliOptions.configDir || './.storybook',
    outputDir: cliOptions.outputDir || './storybook-static',
  });
}
