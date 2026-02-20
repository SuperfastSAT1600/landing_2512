/**
 * UI utilities for colored output and formatting
 */

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const ICONS = {
  success: process.platform === 'win32' ? '[OK]' : '✓',
  error: process.platform === 'win32' ? '[X]' : '✗',
  warning: process.platform === 'win32' ? '[!]' : '⚠',
  info: process.platform === 'win32' ? '[i]' : 'ℹ',
  arrow: process.platform === 'win32' ? '->' : '→',
  bullet: process.platform === 'win32' ? '*' : '•',
};

function color(text, colorName) {
  return `${COLORS[colorName]}${text}${COLORS.reset}`;
}

function log(message, type = 'info') {
  const icons = {
    success: color(ICONS.success, 'green'),
    error: color(ICONS.error, 'red'),
    warning: color(ICONS.warning, 'yellow'),
    info: color(ICONS.info, 'blue'),
  };
  console.log(`${icons[type] || ''} ${message}`);
}

function header(text) {
  const line = '='.repeat(60);
  console.log(`\n${color(line, 'cyan')}`);
  console.log(color(`  ${text}`, 'bright'));
  console.log(`${color(line, 'cyan')}\n`);
}

function subheader(text) {
  console.log(`\n${color(`--- ${text} ---`, 'dim')}\n`);
}

module.exports = {
  COLORS,
  ICONS,
  color,
  log,
  header,
  subheader,
};
