import { join, resolve, dirname } from 'path';

import { rip } from './rip';
import { build } from 'esbuild';
import { pathStats } from './path_stats';
import { isProduction } from './is_production';
import { makeDirectories } from './mkdir';
import { SCRIPTS_LINK_REGEXP } from './constants';
import { ScriptsPluginOptions } from './types';
import { done, oops, start, bold } from './pretty';

type BundleOptions = Required<Omit<ScriptsPluginOptions, 'addWatchTarget'>>;

const findAndProcessFiles = (
  html: string,
  outputPath: string,
  { inputDirectory, esbuildOptions, publicDirectory }: BundleOptions
) => {
  const [buildDirectory, ...nestedHTMLPath] = pathStats(outputPath).directories;

  return rip(html, SCRIPTS_LINK_REGEXP).map(
    async (publicSourcePathToScript) => {
      start(`Start compiling "${bold(publicSourcePathToScript)}" file.`);

      const absolutePathToScript = resolve(
        inputDirectory,
        publicSourcePathToScript
      );
      const publicOutputPathToScript = join(
        publicDirectory,
        publicSourcePathToScript.replace(/ts$/, 'js')
      );

      return makeDirectories(
        dirname(resolve(buildDirectory, publicOutputPathToScript))
      )
        .then(() =>
          build({
            bundle: true,
            target: 'es2017',
            minify: isProduction(),
            outfile: resolve(buildDirectory, publicOutputPathToScript),
            sourcemap: !isProduction(),
            entryPoints: [absolutePathToScript],
            ...esbuildOptions,
          })
        )
        .then(() =>
          done(
            `Compiled "${bold(
              publicSourcePathToScript
            )}" script was written to "${bold(
              join(buildDirectory, publicOutputPathToScript)
            )}"`
          )
        )
        .then(() => ({
          input: publicSourcePathToScript,
          output: join(
            ...nestedHTMLPath.map(() => '..'),
            publicOutputPathToScript
          ),
        }));
    }
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
