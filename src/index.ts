/* -----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as core from "@actions/core";
import { Installer } from "./installer";
import utils from "./util";
import { Inputs } from "./generated/inputs-outputs";

export async function run(): Promise<void> {
    const ocVersionInput = core.getInput(Inputs.OC_VERSION);
    const runnerOS = utils.getRunnerOS();
    // if (!runnerOS) {
    //     throw new Error("Error reading runner OS");
    // }

    core.debug(`${utils.INPUT_OC_VERSION}=${ocVersionInput}`);
    core.debug(`runnerOS: ${runnerOS}`);
    core.debug(`runnerTemp ${process.env.RUNNER_TEMP}`);

    const ocPath = await Installer.installOc(ocVersionInput);
    if (!ocPath.found) {
        throw new Error(ocPath.reason || "Unknown error");
    }

    Installer.addOcToPath(ocPath.path);
}

run().catch(core.setFailed);
