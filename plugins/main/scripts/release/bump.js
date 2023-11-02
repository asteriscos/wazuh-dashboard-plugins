// Specific process to bump this plugin

function run({ logger, ...rest }) {
  logger.warn('This plugin must update the API data');
}

module.exports = run;
