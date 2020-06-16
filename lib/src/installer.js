"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
const core = require("@actions/core");
const fs = require("mz/fs");
const io = require("@actions/io/lib/io");
const ioUtil = require("@actions/io/lib/io-util");
const path = require("path");
const semver = require("semver");
const tc = require("@actions/tool-cache");
const constants_1 = require("./constants");
const command_1 = require("./command");
class Installer {
    static installOc(versionToUse, runnerOS, useLocalOc) {
        return __awaiter(this, void 0, void 0, function* () {
            if (useLocalOc) {
                const localOcPath = yield Installer.getLocalOcBinary(versionToUse);
                if (localOcPath) {
                    return localOcPath;
                }
            }
            if (versionToUse.valid === false) {
                return { found: false, reason: versionToUse.reason };
            }
            // check if oc version requested exists in cache
            let versionToCache;
            if (versionToUse.type === 'number') {
                versionToCache = Installer.versionToCache(versionToUse.value);
                const toolCached = Installer.versionInCache(versionToCache, runnerOS);
                if (toolCached.found) {
                    return toolCached;
                }
            }
            const url = yield Installer.getOcURLToDownload(versionToUse, runnerOS);
            if (!url) {
                return { found: false, reason: 'Unable to determine URL where to download oc executable.' };
            }
            core.debug(`downloading: ${url}`);
            const ocBinary = yield Installer.downloadAndExtract(url, runnerOS, versionToCache);
            return ocBinary;
        });
    }
    static downloadAndExtract(url, runnerOS, versionToCache) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!url) {
                return { found: false, reason: 'URL where to download oc is not valid.' };
            }
            let downloadDir = '';
            const pathOcArchive = yield tc.downloadTool(url);
            if (runnerOS === 'Windows') {
                downloadDir = yield tc.extractZip(pathOcArchive);
            }
            else {
                downloadDir = yield tc.extractTar(pathOcArchive);
            }
            let ocBinary = Installer.ocBinaryByOS(runnerOS);
            ocBinary = path.join(downloadDir, ocBinary);
            if (!(yield ioUtil.exists(ocBinary))) {
                return { found: false, reason: `An error occurred while downloading and extracting oc binary from ${url}.` };
            }
            fs.chmodSync(ocBinary, '0755');
            if (versionToCache) {
                yield tc.cacheFile(ocBinary, path.parse(ocBinary).base, 'oc', versionToCache);
            }
            return { found: true, path: ocBinary };
        });
    }
    static getOcURLToDownload(version, runnerOS) {
        return __awaiter(this, void 0, void 0, function* () {
            let url = '';
            if (!version.valid) {
                return undefined;
            }
            if (version.type === 'url') {
                return version.value;
            }
            if (version.type === 'latest') {
                url = yield Installer.latest(runnerOS);
                return url;
            }
            // determine the base_url based on version
            const reg = new RegExp('\\d+(?=\\.)');
            const vMajorRegEx = reg.exec(version.value);
            if (!vMajorRegEx || vMajorRegEx.length === 0) {
                core.debug('Error retrieving version major');
                return undefined;
            }
            const vMajor = +vMajorRegEx[0];
            const ocUtils = yield Installer.getOcUtils();
            if (vMajor === 3) {
                url = `${ocUtils.openshiftV3BaseUrl}/${version.value}/`;
            }
            else if (vMajor === 4) {
                url = `${ocUtils.openshiftV4BaseUrl}/${version.value}/`;
            }
            else {
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
        });
    }
    static latest(runnerOS) {
        return __awaiter(this, void 0, void 0, function* () {
            const bundle = Installer.getOcBundleByOS(runnerOS);
            if (!bundle) {
                core.debug('Unable to find oc bundle url');
                return null;
            }
            const ocUtils = yield Installer.getOcUtils();
            const url = `${ocUtils.openshiftV4BaseUrl}/${constants_1.LATEST}/${bundle}`;
            core.debug(`latest stable oc version: ${url}`);
            return url;
        });
    }
    static getOcBundleByOS(runnerOS) {
        let url = '';
        // determine the bundle path based on the OS type
        switch (runnerOS) {
            case 'Linux': {
                url += `${constants_1.LINUX}/${constants_1.OC_TAR_GZ}`;
                break;
            }
            case 'macOS': {
                url += `${constants_1.MACOSX}/${constants_1.OC_TAR_GZ}`;
                break;
            }
            case 'Windows': {
                url += `${constants_1.WIN}/${constants_1.OC_ZIP}`;
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
    static getLocalOcBinary(version) {
        return __awaiter(this, void 0, void 0, function* () {
            let ocBinaryStatus;
            let ocPath;
            try {
                ocPath = yield io.which('oc', true);
                ocBinaryStatus = { found: true, path: ocPath };
                core.debug(`ocPath ${ocPath}`);
            }
            catch (ex) {
                ocBinaryStatus = { found: false };
                core.debug(`Oc has not been found on this machine. Err ${ex}`);
            }
            // if user requested to use a specific version, we need to check that version is the one installed
            if (version.valid && version.type === 'number' && ocPath) {
                const localOcVersion = yield Installer.getOcVersion(ocPath);
                core.debug(`localOcVersion ${localOcVersion} vs ${version.value}`);
                if (!localOcVersion.valid || localOcVersion.value.toLowerCase() !== version.value.toLowerCase()) {
                    ocBinaryStatus = { found: false, reason: 'Oc installed has a different version of the one requested.' };
                }
            }
            return ocBinaryStatus;
        });
    }
    static getOcVersion(ocPath) {
        return __awaiter(this, void 0, void 0, function* () {
            let stdOut = '';
            const options = {};
            options.listeners = {
                stdout: (data) => {
                    stdOut += data.toString();
                }
            };
            let exitCode = yield command_1.Command.execute(ocPath, 'version --client=true', options);
            if (exitCode === 1) {
                core.debug('error executing oc version --short=true --client=true');
                // if oc version failed we're dealing with oc < 4.1
                exitCode = yield command_1.Command.execute(ocPath, 'version', options);
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
        });
    }
    static getOcUtils() {
        return __awaiter(this, void 0, void 0, function* () {
            // eslint-disable-next-line no-undef
            const rawData = yield fs.readFile(path.join(__dirname, '/../../oc-utils.json'));
            return JSON.parse(rawData);
        });
    }
    static versionToCache(version) {
        const sanitizedVersion = semver.coerce(version);
        if (!sanitizedVersion)
            return undefined;
        return sanitizedVersion.version;
    }
    /**
     * Retrieve the version of oc CLI in cache
     *
     * @param version version to search in cache
     * @param runnerOS the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'.
     */
    static versionInCache(version, runnerOS) {
        let cachePath;
        if (version) {
            cachePath = tc.find('oc', version);
            if (cachePath) {
                return { found: true, path: path.join(cachePath, Installer.ocBinaryByOS(runnerOS)) };
            }
        }
        return { found: false };
    }
    static ocBinaryByOS(osType) {
        if (osType.includes('Windows'))
            return 'oc.exe';
        return 'oc';
    }
}
exports.Installer = Installer;
