import { join, resolve, dirname } from 'path';

import { build } from 'esbuild';
import { memoize, pipe } from '@fluss/core';

import { rip } from './rip';
import { pathStats } from './path_stats';
import { isProduction } from './is_production';
import { makeDirectories } from './mkdir';
import { SCRIPTS_LINK_REGEXP } from './constants';
import { ScriptsPluginOptions } from './types';
import { done, oops, start, bold } from './pretty';

type BundleOptions = Required<Omit<ScriptsPluginOptions, 'addWatchTarget'>>;

interface TransformFileOptions extends BundleOptions {
  readonly nestedHTMLPath: ReadonlyArray<string>;
  readonly buildDirectory: string;
  readonly publicSourcePathToScript: string;
}

export const transformFile = memoize(
  ({
    inputDirectory,
    nestedHTMLPath,
    buildDirectory,
    esbuildOptions,
    publicDirectory,
    publicSourcePathToScript,
  }: TransformFileOptions) => {
    start(`Start compiling "${bold(publicSourcePathToScript)}" file.`);

    const absolutePathToScript = resolve(
      inputDirectory,
      publicSourcePathToScript
    );
    const publicOutputPathToScript = join(
      publicDirectory,
      publicSourcePathToScript.replace(/ts$/, 'js')
    );

    return pipe(
      () => resolve(buildDirectory, publicOutputPathToScript),
      dirname,
      makeDirectories,
      () =>
        void build({
          bundle: true,
          target: 'es2017',
          minify: isProduction(),
          outfile: resolve(buildDirectory, publicOutputPathToScript),
          sourcemap: !isProduction(),
          entryPoints: [absolutePathToScript],
          ...esbuildOptions,
        }),
      () =>
        void done(
          `Compiled "${bold(
            publicSourcePathToScript
          )}" script was written to "${bold(
            join(buildDirectory, publicOutputPathToScript)
          )}"`
        ),
      () => join(...nestedHTMLPath.map(() => '..'), publicOutputPathToScript)
    )();
  },
  ({ publicSourcePathToScript }) => publicSourcePathToScript
);

const findAndProcessFiles = (
  html: string,
  outputPath: string,
  { inputDirectory, esbuildOptions, publicDirectory }: BundleOptions
) => {
  const [buildDirectory, ...nestedHTMLPath] = pathStats(outputPath).directories;

  return rip(html, SCRIPTS_LINK_REGEXP).map((link) =>
    transformFile({
      inputDirectory,
      publicDirectory,
      esbuildOptions,
      buildDirectory,
      nestedHTMLPath,
      publicSourcePathToScript: link,
    }).then((output) => ({ input: link, output }))
  );
};

/** Compile, bundle and minify script. */
export const bundle = async (
  html: string,
  outputPath: string,
  options: BundleOptions
) =>
  Promise.all(findAndProcessFiles(html, outputPath, options))
    .then((array) => array.filter(Boolean))
    .then(
      (validUrls) => {
        const htmlWithScripts = validUrls.reduce(
          (text, { input, output }) => text.replace(input, output),
          html
        );

        if (validUrls.length > 0) {
          done(
            `${validUrls
              .map(({ output }) => `"${bold(output)}"`)
              .join(', ')} URL${
              validUrls.length === 1 ? ' was' : 's were'
            } injected into "${bold(outputPath)}"`
          );
        }

        return htmlWithScripts;
      },
      (error) => (oops(error), html)
    );
