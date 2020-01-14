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
const core = require("@actions/core");
const ioUtil = require("@actions/io/lib/io-util");
const tc = require("@actions/tool-cache");
const constants_1 = require("./constants");
const fs = require("mz/fs");
const path = require("path");
const validUrl = require("valid-url");
class Installer {
    static installOc(version, runnerOS) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!version) {
                return Promise.reject('Invalid version input. Provide a valid version number or url where to download an oc bundle.');
            }
            let url = '';
            if (validUrl.isWebUri(version)) {
                url = version;
            }
            else {
                url = yield Installer.getOcBundleUrl(version, runnerOS);
            }
            if (!url) {
                return Promise.reject('Unable to determine oc download URL.');
            }
            core.debug(`downloading: ${url}`);
            const ocBinary = yield Installer.downloadAndExtract(url, runnerOS);
            if (!ocBinary) {
                return Promise.reject('Unable to download or extract oc binary.');
            }
            return ocBinary;
        });
    }
    static downloadAndExtract(url, runnerOS) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!url) {
                return null;
            }
            let downloadDir = '';
            const pathOcArchive = yield tc.downloadTool(url);
            let ocBinary;
            if (runnerOS === 'Windows') {
                downloadDir = yield tc.extractZip(pathOcArchive);
                ocBinary = path.join(downloadDir, 'oc.exe');
            }
            else {
                downloadDir = yield tc.extractTar(pathOcArchive);
                ocBinary = path.join(downloadDir, 'oc');
            }
            if (!(yield ioUtil.exists(ocBinary))) {
                return null;
            }
            else {
                fs.chmodSync(ocBinary, '0755');
                return ocBinary;
            }
        });
    }
    static getOcBundleUrl(version, runnerOS) {
        return __awaiter(this, void 0, void 0, function* () {
            let url = '';
            if (version === 'latest') {
                url = yield Installer.latest(runnerOS);
                return url;
            }
            // determine the base_url based on version
            const reg = new RegExp('\\d+(?=\\.)');
            const vMajorRegEx = reg.exec(version);
            if (!vMajorRegEx || vMajorRegEx.length === 0) {
                core.debug('Error retrieving version major');
                return null;
            }
            const vMajor = +vMajorRegEx[0];
            const ocUtils = yield Installer.getOcUtils();
            if (vMajor === 3) {
                url = `${ocUtils.openshiftV3BaseUrl}/${version}/`;
            }
            else if (vMajor === 4) {
                url = `${ocUtils.openshiftV4BaseUrl}/${version}/`;
            }
            else {
                core.debug('Invalid version');
                return null;
            }
            const bundle = yield Installer.getOcBundleByOS(runnerOS);
            if (!bundle) {
                core.debug('Unable to find bundle url');
                return null;
            }
            url += bundle;
            core.debug(`archive URL: ${url}`);
            return url;
        });
    }
    static latest(runnerOS) {
        return __awaiter(this, void 0, void 0, function* () {
            const bundle = yield Installer.getOcBundleByOS(runnerOS);
            if (!bundle) {
                core.debug('Unable to find bundle url');
                return null;
            }
            const ocUtils = yield Installer.getOcUtils();
            const url = `${ocUtils.openshiftV4BaseUrl}/${constants_1.LATEST}/${bundle}`;
            core.debug(`latest stable oc version: ${url}`);
            return url;
        });
    }
    static getOcBundleByOS(runnerOS) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    static getOcUtils() {
        return __awaiter(this, void 0, void 0, function* () {
            const workspace = process.env['GITHUB_WORKSPACE'] || '';
            const rawData = yield fs.readFile(path.join(workspace, 'oc-utils.json'));
            return JSON.parse(rawData);
        });
    }
}
exports.Installer = Installer;
