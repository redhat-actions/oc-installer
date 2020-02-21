/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as core from '@actions/core';
import * as fs from 'mz/fs';
import * as io from '@actions/io/lib/io';
import * as ioUtil from '@actions/io/lib/io-util';
import * as path from 'path';
import * as tc from '@actions/tool-cache';
import * as validUrl from 'valid-url';
import { ExecOptions } from '@actions/exec/lib/interfaces';
import {
  LATEST, LINUX, MACOSX, OC_TAR_GZ, OC_ZIP, WIN
} from './constants';
import { Command } from './command';

export class Installer {
  static async installOc(version: string, runnerOS: string, useLocalOc?: boolean): Promise<string> {
    if (useLocalOc) {
      const localOcPath = await Installer.getLocalOcPath(version);
      if (localOcPath) {
        return localOcPath;
      }
    }
    if (!version) {
      return Promise.reject(new Error('Invalid version input. Provide a valid version number or url where to download an oc bundle.'));
    }
    let url = '';
    if (validUrl.isWebUri(version)) {
      url = version;
    } else {
      url = await Installer.getOcBundleUrl(version, runnerOS);
    }

    core.debug(`downloading: ${url}`);
    const ocBinary = await Installer.downloadAndExtract(url, runnerOS);
    return ocBinary;
  }

  static async downloadAndExtract(url: string, runnerOS: string): Promise<string> {
    if (!url) {
      return Promise.reject(new Error('Unable to determine oc download URL.'));
    }
    let downloadDir = '';
    const pathOcArchive = await tc.downloadTool(url);
    let ocBinary: string;
    if (runnerOS === 'Windows') {
      downloadDir = await tc.extractZip(pathOcArchive);
      ocBinary = path.join(downloadDir, 'oc.exe');
    } else {
      downloadDir = await tc.extractTar(pathOcArchive);
      ocBinary = path.join(downloadDir, 'oc');
    }
    if (!await ioUtil.exists(ocBinary)) {
      return Promise.reject(new Error('Unable to download or extract oc binary.'));
    }
    fs.chmodSync(ocBinary, '0755');
    return ocBinary;
  }

  static async getOcBundleUrl(version: string, runnerOS: string): Promise<string> {
    let url = '';
    if (version === 'latest') {
      url = await Installer.latest(runnerOS);
      return url;
    }

    // determine the base_url based on version
    const reg = new RegExp('\\d+(?=\\.)');
    const vMajorRegEx: RegExpExecArray = reg.exec(version);
    if (!vMajorRegEx || vMajorRegEx.length === 0) {
      core.debug('Error retrieving version major');
      return null;
    }
    const vMajor: number = +vMajorRegEx[0];

    const ocUtils = await Installer.getOcUtils();
    if (vMajor === 3) {
      url = `${ocUtils.openshiftV3BaseUrl}/${version}/`;
    } else if (vMajor === 4) {
      url = `${ocUtils.openshiftV4BaseUrl}/${version}/`;
    } else {
      core.debug('Invalid version');
      return null;
    }

    const bundle = Installer.getOcBundleByOS(runnerOS);
    if (!bundle) {
      core.debug('Unable to find bundle url');
      return null;
    }

    url += bundle;

    core.debug(`archive URL: ${url}`);
    return url;
  }

  static async latest(runnerOS: string): Promise<string> {
    const bundle = Installer.getOcBundleByOS(runnerOS);
    if (!bundle) {
      core.debug('Unable to find bundle url');
      return null;
    }

    const ocUtils = await Installer.getOcUtils();
    const url = `${ocUtils.openshiftV4BaseUrl}/${LATEST}/${bundle}`;

    core.debug(`latest stable oc version: ${url}`);
    return url;
  }

  static getOcBundleByOS(runnerOS: string): string | null {
    let url = '';
    // determine the bundle path based on the OS type
    switch (runnerOS) {
      case 'Linux': {
        url += `${LINUX}/${OC_TAR_GZ}`;
        break;
      }
      case 'macOS': {
        url += `${MACOSX}/${OC_TAR_GZ}`;
        break;
      }
      case 'Windows': {
        url += `${WIN}/${OC_ZIP}`;
        break;
      }
      default: {
        return null;
      }
    }
    return url;
  }

  /**
   * Retrieve the path of the oc CLI installed in the machine.
   *
   * @param version the version of `oc` to be used. If not specified any `oc` version,
   *                if found, will be used.
   * @return the full path to the installed executable or
   *         undefined if the oc CLI version requested is not found.
   */
  static async getLocalOcPath(version?: string): Promise<string | undefined> {
    let ocPath: string | undefined;
    try {
      ocPath = await io.which('oc', true);
      core.debug(`ocPath ${ocPath}`);
    } catch (ex) {
      core.debug(`Oc has not been found on this machine. Err ${ex}`);
    }

    if (version && ocPath) {
      const localOcVersion = await Installer.getOcVersion(ocPath);
      core.debug(`localOcVersion ${localOcVersion} vs ${version}`);
      if (!localOcVersion
          || localOcVersion.toLowerCase() !== version.toLowerCase()
      ) {
        return undefined;
      }
    }

    return ocPath;
  }

  static async getOcVersion(ocPath: string): Promise<string> {
    let stdOut = '';
    const options: ExecOptions = {};
    options.listeners = {
      stdout: (data: Buffer): void => {
        stdOut += data.toString();
      }
    };

    let exitCode: number = await Command.execute(
      ocPath,
      'version --client=true',
      options
    );

    if (exitCode === 1) {
      core.debug('error executing oc version --short=true --client=true');
      // if oc version failed we're dealing with oc < 4.1
      exitCode = await Command.execute(ocPath, 'version', options);
    }

    if (exitCode === 1) {
      core.debug('error executing oc version');
      return undefined;
    }

    core.debug(`stdout ${stdOut}`);
    const regexVersion = new RegExp('v[0-9]+.[0-9]+.[0-9]+');
    const versionObj = regexVersion.exec(stdOut);

    if (versionObj && versionObj.length > 0) {
      return versionObj[0];
    }

    return undefined;
  }

  static async getOcUtils(): Promise<{ [key: string]: string }> {
    // eslint-disable-next-line no-undef
    const rawData = await fs.readFile(path.join(__dirname, '/../../oc-utils.json'));
    return JSON.parse(rawData);
  }
}
