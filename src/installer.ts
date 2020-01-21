import * as core from '@actions/core';
import * as fs from 'mz/fs';
import * as ioUtil from '@actions/io/lib/io-util';
import * as path from 'path';
import * as tc from '@actions/tool-cache';
import * as validUrl from 'valid-url';
import { LATEST, LINUX, MACOSX, OC_TAR_GZ, OC_ZIP, WIN } from './constants';

export class Installer {
    static async installOc(version: string, runnerOS: string): Promise<string> {
        if (!version) {
            return Promise.reject('Invalid version input. Provide a valid version number or url where to download an oc bundle.');
        }
        let url = '';
        if (validUrl.isWebUri(version)) {
            url = version;
        } else {
            url = await Installer.getOcBundleUrl(version, runnerOS);
        }

        core.debug(`downloading: ${url}`);
        return await Installer.downloadAndExtract(
            url,
            runnerOS
        );
    }

    static async downloadAndExtract(url: string, runnerOS: string): Promise<string> {
        if (!url) {
            return Promise.reject('Unable to determine oc download URL.');
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
            return Promise.reject('Unable to download or extract oc binary.');
        } else {
            fs.chmodSync(ocBinary, '0755');
            return ocBinary;
        }
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

        const bundle = await Installer.getOcBundleByOS(runnerOS);
        if (!bundle) {
            core.debug('Unable to find bundle url');
            return null;
        }

        url += bundle;

        core.debug(`archive URL: ${url}`);
        return url;
    }

    static async latest(runnerOS: string): Promise<string> {
        const bundle = await Installer.getOcBundleByOS(runnerOS);
        if (!bundle) {
            core.debug('Unable to find bundle url');
            return null;
        }

        const ocUtils = await Installer.getOcUtils();
        const url = `${ocUtils.openshiftV4BaseUrl}/${LATEST}/${bundle}`;

        core.debug(`latest stable oc version: ${url}`);
        return url;
    }

    static async getOcBundleByOS(runnerOS: string): Promise<string | null> {
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

    static async getOcUtils(): Promise<{ [key: string]: string }> {
        // eslint-disable-next-line no-undef
        const rawData = await fs.readFile(path.join(__dirname, '/../../oc-utils.json'));
        return JSON.parse(rawData);
    }
}