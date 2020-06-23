/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as core from '@actions/core';
import * as fs from 'mz/fs';
import * as glob from 'glob';
import * as io from '@actions/io/lib/io';
import * as ioUtil from '@actions/io/lib/io-util';
import * as path from 'path';
import * as semver from 'semver';
import * as tc from '@actions/tool-cache';
import { ExecOptions } from '@actions/exec/lib/interfaces';
import {
  LATEST, LINUX, MACOSX, OC_TAR_GZ, OC_ZIP, WIN
} from './constants';
import { Command } from './command';
import { BinaryVersion, FindBinaryStatus } from './utils/execHelper';

export class Installer {
  static async installOc(versionToUse: BinaryVersion, runnerOS: string, useLocalOc?: boolean): Promise<FindBinaryStatus> {
    if (useLocalOc) {
      const localOcPath = await Installer.getLocalOcBinary(versionToUse);
      if (localOcPath) {
        return localOcPath;
      }
    }

    if (versionToUse.valid === false) {
      return { found: false, reason: versionToUse.reason };
    }

    // check if oc version requested exists in cache
    let versionToCache: string;
    if (versionToUse.type === 'number') {
      versionToCache = Installer.versionToCache(versionToUse.value);
      const toolCached: FindBinaryStatus = Installer.versionInCache(versionToCache, runnerOS);
      if (toolCached.found) {
        return toolCached;
      }
    }

    const url: string = await Installer.getOcURLToDownload(versionToUse, runnerOS);
    if (!url) {
      return { found: false, reason: 'Unable to determine URL where to download oc executable.' };
    }

    core.debug(`downloading: ${url}`);
    const ocBinary = await Installer.downloadAndExtract(url, runnerOS, versionToCache);
    return ocBinary;
  }

  static async downloadAndExtract(url: string, runnerOS: string, versionToCache: string): Promise<FindBinaryStatus> {
    if (!url) {
      return { found: false, reason: 'URL where to download oc is not valid.' };
    }

    let downloadDir = '';
    const pathOcArchive = await tc.downloadTool(url);
    if (runnerOS === 'Windows') {
      downloadDir = await tc.extractZip(pathOcArchive);
    } else {
      downloadDir = await tc.extractTar(pathOcArchive);
    }

    let ocBinary: string = Installer.ocBinaryByOS(runnerOS);
    ocBinary = await Installer.findOcFile(downloadDir, ocBinary);
    if (!await ioUtil.exists(ocBinary)) {
      return { found: false, reason: `An error occurred while downloading and extracting oc binary from ${url}. File ${ocBinary} not found.` };
    }
    fs.chmodSync(ocBinary, '0755');
    if (versionToCache) {
      await tc.cacheFile(ocBinary, path.parse(ocBinary).base, 'oc', versionToCache);
    }
    return { found: true, path: ocBinary };
  }

  static async getOcURLToDownload(version: BinaryVersion, runnerOS: string): Promise<string> {
    let url = '';
    if (!version.valid) {
      return undefined;
    }

    if (version.type === 'url') {
      return version.value;
    }

    if (version.type === 'latest') {
      url = await Installer.latest(runnerOS);
      return url;
    }

    // determine the base_url based on version
    const reg = new RegExp('\\d+(?=\\.)');
    const vMajorRegEx: RegExpExecArray = reg.exec(version.value);
    if (!vMajorRegEx || vMajorRegEx.length === 0) {
      core.debug('Error retrieving version major');
      return undefined;
    }
    const vMajor: number = +vMajorRegEx[0];

    const ocUtils = await Installer.getOcUtils();
    if (vMajor === 3) {
      url = `${ocUtils.openshiftV3BaseUrl}/${version.value}/`;
    } else if (vMajor === 4) {
      url = `${ocUtils.openshiftV4BaseUrl}/${version.value}/`;
    } else {
      core.debug('Invalid version');
      return undefined;
    }

    const bundle = Installer.getOcBundleByOS(runnerOS);
    if (!bundle) {
      core.debug('Unable to find oc bundle url');
      return undefined;
    }

    url += bundle;

    core.debug(`archive URL: ${url}`);
    return url;
  }

  static async latest(runnerOS: string): Promise<string> {
    const bundle = Installer.getOcBundleByOS(runnerOS);
    if (!bundle) {
      core.debug('Unable to find oc bundle url');
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
   * Retrieve the oc CLI installed in the machine.
   *
   * @param version the version of `oc` to be used.
   *                If no version was specified, it uses the oc CLI found whatever its version.
   * @return the installed executable
   */
  static async getLocalOcBinary(version: BinaryVersion): Promise<FindBinaryStatus> {
    let ocBinaryStatus: FindBinaryStatus;
    let ocPath: string | undefined;
    try {
      ocPath = await io.which('oc', true);
      ocBinaryStatus = { found: true, path: ocPath };
      core.debug(`ocPath ${ocPath}`);
    } catch (ex) {
      ocBinaryStatus = { found: false };
      core.debug(`Oc has not been found on this machine. Err ${ex}`);
    }

    // if user requested to use a specific version, we need to check that version is the one installed
    if (version.valid && version.type === 'number' && ocPath) {
      const localOcVersion: BinaryVersion = await Installer.getOcVersion(ocPath);
      core.debug(`localOcVersion ${localOcVersion} vs ${version.value}`);
      if (!localOcVersion.valid || localOcVersion.value.toLowerCase() !== version.value.toLowerCase()) {
        ocBinaryStatus = { found: false, reason: 'Oc installed has a different version of the one requested.' };
      }
    }

    return ocBinaryStatus;
  }

  static async getOcVersion(ocPath: string): Promise<BinaryVersion> {
    let stdOut = '';
    const options: ExecOptions = {};
    options.listeners = {
      stdout: (data: Buffer): void => {
        stdOut += data.toString();
      }
    };

    let exitCode: number = await Command.execute(ocPath, 'version --client=true', options);

    if (exitCode === 1) {
      core.debug('error executing oc version --short=true --client=true');
      // if oc version failed we're dealing with oc < 4.1
      exitCode = await Command.execute(ocPath, 'version', options);
    }

    if (exitCode === 1) {
      core.debug('error executing oc version');
      return { valid: false, reason: `An error occured when retrieving version of oc CLI in ${ocPath}` };
    }

    core.debug(`stdout ${stdOut}`);
    const regexVersion = new RegExp('v[0-9]+.[0-9]+.[0-9]+');
    const versionObj = regexVersion.exec(stdOut);

    if (versionObj && versionObj.length > 0) {
      return { valid: true, type: 'number', value: versionObj[0] };
    }

    return { valid: false, reason: `The version of oc CLI in ${ocPath} is in an unknown format.` };
  }

  static async getOcUtils(): Promise<{ [key: string]: string }> {
    // eslint-disable-next-line no-undef
    const rawData = await fs.readFile(path.join(__dirname, '/../../oc-utils.json'));
    return JSON.parse(rawData);
  }

  private static versionToCache(version: string): string {
    const sanitizedVersion: semver.SemVer = semver.coerce(version);
    if (!sanitizedVersion) return undefined;
    return sanitizedVersion.version;
  }

  /**
   * Retrieve the version of oc CLI in cache
   *
   * @param version version to search in cache
   * @param runnerOS the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'.
   */
  static versionInCache(version: string, runnerOS: string): FindBinaryStatus {
    let cachePath: string;
    if (version) {
      cachePath = tc.find('oc', version);
      if (cachePath) {
        return { found: true, path: path.join(cachePath, Installer.ocBinaryByOS(runnerOS)) };
      }
    }
    return { found: false };
  }

  private static ocBinaryByOS(osType: string): string {
    if (osType.includes('Windows')) return 'oc.exe';
    return 'oc';
  }

  /**
   * Adds oc to the PATH environment variable.
   *
   * @param ocPath the full path to the oc binary. Must be a non null.
   * @param osType the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'.
   */
  static addOcToPath(ocPath: string, osType: string): void {
    if (!ocPath) {
      core.debug('Unable to add null or empty Oc path to the PATH.');
      return;
    }
    let dir = '';
    if (osType.includes('Windows')) {
      dir = ocPath.substr(0, ocPath.lastIndexOf('\\'));
    } else {
      dir = ocPath.substr(0, ocPath.lastIndexOf('/'));
    }
    core.addPath(dir);
  }

  static async findOcFile(folder, file): Promise<string> {
    return new Promise((resolve, reject) => {
      glob(`${folder}/**/${file}`, (err, res) => {
        if (err) {
          reject(new Error(`Unable to find oc exewcutable inside the directory ${folder}`));
        } else {
          resolve(res[0]);
        }
      });
    });
  }
}
