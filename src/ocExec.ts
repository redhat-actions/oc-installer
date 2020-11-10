/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as core from '@actions/core';
import { Installer } from './installer';
import {
  BinaryVersion,
  convertStringToBinaryVersion,
  FindBinaryStatus,
  getReason
} from './utils/execHelper';
import { INPUT_OC_VERSION } from "./constants";

export async function run(): Promise<void> {
  const ocVersion = core.getInput(INPUT_OC_VERSION);
  const runnerOS = process.env.RUNNER_OS;
  if (!runnerOS) {
    throw new Error('Error reading runner OS');
  }

  core.debug(`${INPUT_OC_VERSION}=${ocVersion}`);
  core.debug(`runnerOS: ${runnerOS}`);
  core.debug(`runnerTemp ${process.env.RUNNER_TEMP}`);

  const binaryVersion: BinaryVersion = convertStringToBinaryVersion(ocVersion);
  const ocBinary: FindBinaryStatus = await Installer.installOc(binaryVersion, runnerOS);
  if (ocBinary.found === false) {
    return Promise.reject(new Error(getReason(ocBinary)));
  }

  Installer.addOcToPath(ocBinary.path);
}

run().catch(core.setFailed);
