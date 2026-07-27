/* -----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as core from "@actions/core";
import { Installer } from "./installer";
import utils from "./util";
import { Inputs } from "./generated/inputs-outputs";

export async function run(): Promise<void> {
    core.warning(
        "redhat-actions/oc-installer is deprecated and will no longer receive updates. "
        + "Please migrate to redhat-actions/openshift-tools-installer, which supports "
        + "semver ranges, multiple tools, arm64, and cross-workflow caching. "
        + "See https://github.com/redhat-actions/openshift-tools-installer for details.",
    );

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
