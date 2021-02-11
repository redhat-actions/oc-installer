/* -----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

type RunnerOS = "Linux" | "macOS" | "Windows";

namespace Utils {
    export const INPUT_OC_VERSION = "oc_version";

    export const LATEST = "latest";

    let runnerOS: RunnerOS;
    export function getRunnerOS(): RunnerOS {
        const envRunnerOS = process.env.RUNNER_OS as RunnerOS | undefined;

        if (envRunnerOS === undefined) {
            throw new Error("Could not determine OS; RUNNER_OS is not set in the environment.");
        }
        else {
            runnerOS = envRunnerOS;
        }

        // if (runnerOS == null) {
        //     throw new Error("Could not determine OS; RUNNER_OS is not set in the environment.");
        // }
        return runnerOS;
    }

    export function getDownloadSite(version: 3 | 4): string {
        switch (version) {
        case 3:
            return "https://mirror.openshift.com/pub/openshift-v3/clients";
        case 4:
            return "https://mirror.openshift.com/pub/openshift-v4/clients/oc";
        default:
            throw new Error(`No download site for oc version "${version}". Supported versions are "3" and "4".`);
        }
    }

    export function getOcBinaryFilename(): string {
        if (runnerOS === "Windows") {
            return "oc.exe";
        }
        return "oc";
    }

    export function getZipPath(): string {
        // determine the path within the oc download site based on the OS type
        const OC_TAR_GZ = "oc.tar.gz";
        const OC_ZIP = "oc.zip";
        const os = getRunnerOS();

        switch (os) {
        case "Linux": {
            return `linux/${OC_TAR_GZ}`;
        }
        case "macOS": {
            return `macosx/${OC_TAR_GZ}`;
        }
        case "Windows": {
            return `windows/${OC_ZIP}`;
        }
        default: {
            throw new Error(`Unrecognized runner OS "${os}"`);
        }
        }
    }

    export function getLatestUrl(): string {
        // The latest uses a different path/filename from the others because it's under the ocp subdir

        const latestDir = "https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/";

        let filename = "openshift-client-";
        const os = getRunnerOS();
        switch (os) {
        case "Linux":
            filename += "linux.tar.gz";
            break;
        case "macOS":
            filename += "mac.tar.gz";
            break;
        case "Windows":
            filename += "windows.zip";
            break;
        default:
            throw new Error(`Unrecognized runner OS "${os}"`);
        }
        return latestDir + filename;
    }
}
export default Utils;
