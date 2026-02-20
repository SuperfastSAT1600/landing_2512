/**
 * User input utilities using enquirer (cross-platform, Mac-friendly)
 */

const { Input, Confirm, Select, Password } = require('enquirer');

/**
 * Ask a question and wait for answer
 * @param {object} _rl - Readline interface (ignored, kept for API compatibility)
 * @param {string} question - Question to ask
 * @param {string} defaultValue - Default value if user presses Enter (optional)
 * @returns {Promise<string>} User's answer or default value
 */
async function ask(_rl, question, defaultValue = '') {
  const prompt = new Input({
    message: question,
    initial: defaultValue,
  });

  try {
    const answer = await prompt.run();
    return answer || defaultValue;
  } catch (error) {
    // User cancelled (Ctrl+C)
    process.exit(0);
  }
}

/**
 * Ask a yes/no question
 */
async function askYesNo(_rl, question, defaultYes = true) {
  const prompt = new Confirm({
    message: question,
    initial: defaultYes,
  });

  try {
    return await prompt.run();
  } catch (error) {
    // User cancelled (Ctrl+C)
    process.exit(0);
  }
}

/**
 * Ask for secret input (password/token) - shows asterisks
 */
async function askSecret(_rl, question) {
  const prompt = new Password({
    message: question,
    mask: '*',
  });

  try {
    const answer = await prompt.run();
    return answer || '';
  } catch (error) {
    // User cancelled (Ctrl+C)
    process.exit(0);
  }
}

/**
 * Ask user to choose from a list
 */
async function askChoice(_rl, question, choices) {
  const prompt = new Select({
    message: question,
    choices: choices.map((choice, index) => {
      if (typeof choice === 'string') {
        return { name: choice, message: choice, value: choice };
      }
      const label = choice.label || choice.value || choice;
      const description = choice.description ? ` - ${choice.description}` : '';
      return {
        name: choice.value || choice,
        message: `${label}${description}`,
        value: choice.value || choice,
      };
    }),
  });

  try {
    return await prompt.run();
  } catch (error) {
    // User cancelled (Ctrl+C)
    process.exit(0);
  }
}

module.exports = {
  ask,
  askYesNo,
  askSecret,
  askChoice,
};
