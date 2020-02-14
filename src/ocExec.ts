/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as core from '@actions/core';
// eslint-disable-next-line no-unused-vars
import { OcAuth, OpenShiftEndpoint } from './auth';
import { Command } from './command';
import { Installer } from './installer';

export async function run(): Promise<void> {
  const openShiftUrl = core.getInput('openshift_server_url');
  const parameters = core.getInput('parameters');
  const version = core.getInput('version');
  const args = core.getInput('cmd');
  const runnerOS = process.env.RUNNER_OS;

  core.debug(version);
  core.debug(runnerOS);
  core.debug(process.env.RUNNER_TEMP);

  if (!args) {
    return Promise.reject(new Error('Invalid cmd input. Insert at least one command to be executed.'));
  }
  const cmds = args.split('\n');

  const ocPath = await Installer.installOc(version, runnerOS);
  if (ocPath === null) {
    return Promise.reject(new Error('no oc binary found'));
  }

  const endpoint: OpenShiftEndpoint = OcAuth.initOpenShiftEndpoint(openShiftUrl, parameters);
  await OcAuth.loginOpenshift(endpoint, ocPath);
  for (const cmd of cmds) {
    // eslint-disable-next-line no-await-in-loop
    await Command.execute(ocPath, cmd);
  }
}

run().catch(core.setFailed);
