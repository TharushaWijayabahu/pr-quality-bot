import * as core from '@actions/core';

export const logger = {
  info(message: string): void {
    core.info(`[PR Quality Bot] ${message}`);
  },
  warning(message: string): void {
    core.warning(`[PR Quality Bot] ${message}`);
  },
};
