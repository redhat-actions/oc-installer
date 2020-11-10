/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as core from '@actions/core';
import * as io from '@actions/io/lib/io';
import * as ioUtil from '@actions/io/lib/io-util';
import * as exec from '@actions/exec';
import { ExecOptions } from '@actions/exec/lib/interfaces';
import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import * as semver from 'semver';
import * as tc from '@actions/tool-cache';
import {
  LATEST
} from './constants';
import { BinaryVersion, FindBinaryStatus } from './utils/execHelper';

export class Installer {
  static async installOc(versionToUse: BinaryVersion, runnerOS: string, useLocalOc?: boolean): Promise<FindBinaryStatus> {
    if (useLocalOc) {
      const localOcPath = await Installer.getLocalOcBinary(versionToUse);
      if (localOcPath) {
        return localOcPath;
      }
    }

    // check if oc version requested exists in cache
    let versionToCache: string | undefined;
    if (versionToUse.type === 'number') {
      versionToCache = Installer.versionToCache(versionToUse.value);
      if (versionToCache) {
        const toolCached: FindBinaryStatus = Installer.versionInCache(versionToCache, runnerOS);
        if (toolCached.found) {
          return toolCached;
        }
      }
    }

    const url: string = Installer.getOcURLToDownload(versionToUse, runnerOS);
    if (!url) {
      throw new Error('Unable to determine URL where to download oc executable.');
    }

    core.info(`Installing oc version ${versionToUse.value}`);
    core.info(`Downloading from ${url}`);
    const ocBinary = await Installer.downloadAndExtract(url, runnerOS, versionToCache);
    return ocBinary;
  }

  static async downloadAndExtract(url: string, runnerOS: string, versionToCache: string | undefined): Promise<FindBinaryStatus> {
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
      core.debug('Added oc to tool cache');
    }
    core.info(`oc installed to ${ocBinary}`);
    return { found: true, path: ocBinary };
  }

  static getOcURLToDownload(version: BinaryVersion, runnerOS: string): string {
    let url = '';

    if (version.type === 'url') {
      return version.value;
    }

    if (version.type === LATEST) {
      url = Installer.latest(runnerOS);
      return url;
    }

    // determine the base_url based on version
    const reg = new RegExp('\\d+(?=\\.)');
    const vMajorRegEx = reg.exec(version.value);
    if (!vMajorRegEx || vMajorRegEx.length === 0) {
      throw new Error(`Failed to parse version input "${version.value}`);
    }
    const vMajor: number = +vMajorRegEx[0];

    const ocUtils = Installer.getOcUtils();
    if (vMajor === 3) {
      url = `${ocUtils.openshiftV3BaseUrl}/${version.value}/`;
    } else if (vMajor === 4) {
      url = `${ocUtils.openshiftV4BaseUrl}/${version.value}/`;
    } else {
      throw new Error('Major version must be "3" or "4". No other versions of oc are supported.');
    }

    const bundle = Installer.getOcBundleByOS(runnerOS);
    url += bundle;

    core.debug(`archive URL: ${url}`);
    return url;
  }

  static latest(runnerOS: string): string {
    const bundle = Installer.getOcBundleByOS(runnerOS);

    const ocUtils = Installer.getOcUtils();
    const url = `${ocUtils.openshiftV4BaseUrl}/${LATEST}/${bundle}`;

    core.debug(`latest stable oc version: ${url}`);
    return url;
  }

  static getOcBundleByOS(runnerOS: string): string {
    let url = '';
    // determine the bundle path within the oc ownload site based on the OS type
  const OC_TAR_GZ = 'oc.tar.gz';
  const OC_ZIP = 'oc.zip';
    switch (runnerOS) {
      case 'Linux': {
        url += `linux/${OC_TAR_GZ}`;
        break;
      }
      case 'macOS': {
        url += `macosx/${OC_TAR_GZ}`;
        break;
      }
      case 'Windows': {
        url += `windows/${OC_ZIP}`;
        break;
      }
      default: {
        throw new Error(`Unrecognized runner OS "${runnerOS}"`);
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
    if (version && version.type === 'number' && ocPath) {
      const localOcVersion: BinaryVersion = await Installer.getOcVersion(ocPath);
      core.debug(`localOcVersion ${localOcVersion} vs ${version.value}`);
      if (!localOcVersion || localOcVersion.value.toLowerCase() !== version.value.toLowerCase()) {
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

    let exitCode: number = await Installer.execute(ocPath, ['version', '--client=true'], options);

    if (exitCode === 1) {
      core.debug('error executing oc version --short=true --client=true');
      // if oc version failed we're dealing with oc < 4.1
      exitCode = await Installer.execute(ocPath, ['version'], options);
    }

    if (exitCode !== 0) {
      throw new Error(`Received exit code ${exitCode} when retrieving version of oc CLI in ${ocPath}`);
    }

    core.debug(`stdout ${stdOut}`);
    const regexVersion = new RegExp('v[0-9]+.[0-9]+.[0-9]+');
    const versionObj = regexVersion.exec(stdOut);

    if (versionObj && versionObj.length > 0) {
      return { type: 'number', value: versionObj[0] };
    }

    throw new Error(`Could not parse version output "${versionObj} from ${ocPath}`);
  }

  static getOcUtils(): { openshiftV3BaseUrl: string; openshiftV4BaseUrl: string } {
    return {
      openshiftV3BaseUrl: 'https://mirror.openshift.com/pub/openshift-v3/clients',
      openshiftV4BaseUrl: 'https://mirror.openshift.com/pub/openshift-v4/clients/oc'
    };
  }

  private static versionToCache(version: string): string | undefined {
    const sanitizedVersion = semver.coerce(version);
    if (!sanitizedVersion) {
      return undefined;
    }
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
   * @param ocPath the full path to the oc binary.
   */
  static addOcToPath(ocPath: string): void {
    const dir = path.dirname(ocPath);
    if (!dir) {
      throw new Error(`Failed to parse directory name from ${ocPath}`);
    }
    core.addPath(dir);
    core.info(`Added oc directory to PATH`);
  }

  static async findOcFile(folder: string, file: string): Promise<string> {
    return new Promise((resolve, reject) => {
      glob(`${folder}/**/${file}`, (err, res) => {
        if (err) {
          reject(new Error(`Unable to find oc executable inside the directory ${folder}`));
        } else {
          resolve(res[0]);
        }
      });
    });
  }

  static async execute(ocPath: string, args: string[], options?: ExecOptions): Promise<number> {
    const exitCode = await exec.exec(`${ocPath}`, args, options);
    return exitCode;
  }
}
