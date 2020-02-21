/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as exec from '@actions/exec';
import * as split from 'argv-split';
import * as sub from 'substituter';
import { ExecOptions } from '@actions/exec/lib/interfaces';

export class Command {
  static async execute(ocPath: string, args: string, options?: ExecOptions): Promise<number> {
    if (!ocPath) {
      return Promise.reject(new Error('Unable to find oc bundle'));
    }

    const cmdArgs = Command.prepareOcArgs(args);
    const exitCode = await exec.exec(`${ocPath} ${cmdArgs}`, undefined, options);
    return exitCode;
  }

  static prepareOcArgs(ocArgs: string): string {
    const interpolatedArgs = sub(ocArgs, process.env);
    let args: string[] = split(interpolatedArgs);
    if (args[0] === 'oc' || args[0] === 'oc.exe') {
      args = args.slice(1);
    }
    return args.join(' ');
  }
}
