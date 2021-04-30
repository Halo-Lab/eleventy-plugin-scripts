import { join } from 'path';

import { bundle } from './bundle';
import { ScriptsPluginOptions } from './types';
import {
  DEFAULT_SOURCE_DIRECTORY,
  DEFAULT_SCRIPTS_DIRECTORY,
} from './constants';

/**
 * Plugin that searches for links to scripts inside HTML,
 * compiles and minifies them. After that - writes
 * to the _output_ directory.
 */
export const scripts = (
  config: Record<string, Function>,
  {
    inputDirectory = join(DEFAULT_SOURCE_DIRECTORY, DEFAULT_SCRIPTS_DIRECTORY),
    esbuildOptions = {},
    publicDirectory = '',
    addWatchTarget = true,
  }: ScriptsPluginOptions = {}
) => {
  config.addTransform('scripts', async (content: string, outputPath: string) =>
    outputPath.endsWith('html')
      ? bundle(content, outputPath, {
          inputDirectory,
          publicDirectory,
          esbuildOptions,
        })
      : content
  );

  if (addWatchTarget) {
    config.addWatchTarget(inputDirectory);
  }
};

export { ScriptsPluginOptions };
