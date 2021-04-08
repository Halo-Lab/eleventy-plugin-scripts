export const PLUGIN_NAME = 'Scripts';

/** Match script link (src) and get URL of script from HTML */
export const SCRIPTS_LINK_REGEXP = /<script\s+[^>]*src="([^"]+\.(?:js|ts))"[^>]*>/g;

export const DEFAULT_SOURCE_DIRECTORY = 'src';
export const DEFAULT_SCRIPTS_DIRECTORY = 'scripts';
