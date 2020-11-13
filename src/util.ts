/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

type RunnerOS = 'Linux' | 'macOS' | 'Windows';

namespace Utils {
  export const INPUT_OC_VERSION = 'oc_version';

  export const LATEST = 'latest';

  let runnerOS: RunnerOS | undefined;
  export function getRunnerOS(): RunnerOS {
    if (runnerOS) {
      return runnerOS;
    }

    runnerOS = process.env.RUNNER_OS as RunnerOS | undefined;
    if (runnerOS == null) {
      throw new Error('Could not determine OS; RUNNER_OS is not set in the environment.');
    }
    return runnerOS;
  }

  export function getDownloadSite(version: 3 | 4): string {
    if (version === 3) {
      return 'https://mirror.openshift.com/pub/openshift-v3/clients';
    } else if (version === 4) {
      return 'https://mirror.openshift.com/pub/openshift-v4/clients/oc';
    }
    throw new Error(`No download site for oc version "${version}". Supported versions are "3" and "4".`);
  }

  export function getOcBinaryFilename(): string {
    if (runnerOS === 'Windows') {
      return 'oc.exe';
    }
    return 'oc';
  }

  export function getZipPath(): string {
    // determine the path within the oc download site based on the OS type
    const OC_TAR_GZ = 'oc.tar.gz';
    const OC_ZIP = 'oc.zip';
    const os = getRunnerOS();

    switch (os) {
      case 'Linux': {
        return `linux/${OC_TAR_GZ}`;
      }
      case 'macOS': {
        return `macosx/${OC_TAR_GZ}`;
      }
      case 'Windows': {
        return `windows/${OC_ZIP}`;
      }
      default: {
        throw new Error(`Unrecognized runner OS "${os}"`);
      }
    }
  }

  export function getLatestUrl(): string {
    const bundle = getZipPath();
    const url = `${getDownloadSite(4)}/${LATEST}/${bundle}`;
    return url;
  }
}
export default Utils;
