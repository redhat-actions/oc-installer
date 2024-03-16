/* -----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as core from "@actions/core";
import * as io from "@actions/io";
import * as exec from "@actions/exec";
import {
    ExecOptions,
} from "@actions/exec/lib/interfaces";
import * as fs from "fs";
import {
    promisify,
} from "util";
import * as glob from "glob";
import * as path from "path";
import * as tc from "@actions/tool-cache";
import utils from "./util";
import {
    getBinaryDownloadType,
    FindBinaryStatus,
    stringToVersion,
    BinaryVersion,
    BinaryTypeVersion,
} from "./binary";

export class Installer {
    static async installOc(versionInput: string): Promise<FindBinaryStatus> {
        const binaryVersion = getBinaryDownloadType(versionInput);

        let url;
        switch (binaryVersion.type) {
        case "latest":
            url = utils.getLatestUrl();
            break;
        case "url":
            url = binaryVersion.url;
            break;
        case "version":
            core.info(`Installing oc version ${binaryVersion.parsedVersion.version}`);
            url = Installer.getOcURLToDownload(binaryVersion.parsedVersion);
            break;
        default:
            break;
        }
        if (!url) {
            throw new Error(`Unrecognized version input "${versionInput}"`);
        }

        core.info(`Downloading ${utils.getOcBinaryFilename()} from ${url} ...`);
        const ocBinary = await Installer.downloadAndExtract(
            url,
            binaryVersion.type === "version" ? binaryVersion.parsedVersion : undefined
        );
        return ocBinary;
    }

    static async downloadAndExtract(url: string, versionToCache: BinaryVersion | undefined): Promise<FindBinaryStatus> {
        let downloadDir = "";
        const pathOcArchive = await tc.downloadTool(url);
        if (url.endsWith("zip")) {
            downloadDir = await tc.extractZip(pathOcArchive);
        }
        else if (url.endsWith("tar") || url.endsWith("tar.gz")) {
            downloadDir = await tc.extractTar(pathOcArchive);
        }
        else {
            throw new Error("Download URL is neither a zip file nor a tarball");
        }

        const ocBinaryFilename: string = utils.getOcBinaryFilename();
        const ocBinaryPath = await Installer.findOcFile(downloadDir, ocBinaryFilename);
        if (!ocBinaryPath) {
            return {
                found: false,
                reason: `An error occurred while downloading and extracting oc binary from ${url}. `
                + `File ${ocBinaryFilename} not found.`,
            };
        }
        await promisify(fs.chmod)(ocBinaryPath, "0755");
        if (versionToCache) {
            await tc.cacheFile(ocBinaryPath, path.parse(ocBinaryPath).base, "oc", versionToCache.version);
            core.info(`Added oc ${versionToCache.version} to tool cache`);
        }
        core.info(`oc installed to ${ocBinaryPath}`);
        return {
            found: true,
            path: ocBinaryPath,
        };
    }

    static getOcURLToDownload(version: BinaryVersion): string {
        const major = version.major;
        if (major !== 3 && major !== 4) {
            throw new Error(`Major version must be "3" or "4". No other versions of oc are supported.`);
        }

        const url = `${utils.getDownloadSite(major)}/${version.version}/${utils.getZipPath()}`;
        core.info(`Found oc version ${version.version} at ${url}`);
        return url;
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
        core.info("Added oc directory to PATH");
    }

    /**
   * Retrieve the oc CLI installed in the machine.
   *
   * @param version the version of `oc` to be used.
   *                If no version was specified, it uses the oc CLI found whatever its version.
   * @return the installed executable if found
   */
    static async getLocalOcBinary(version: BinaryTypeVersion): Promise<string | undefined> {
        let ocPath: string | undefined;
        try {
            ocPath = await io.which("oc", true);
            core.info(`ocPath ${ocPath}`);
        }
        catch (ex) {
            core.info("oc was not been found on this runner.");
            return undefined;
        }

        // if user requested to use a specific version, we need to check that version is the one installed
        const localOcVersion = await Installer.runOcVersion(ocPath);
        core.info(
            `Local oc version is ${localOcVersion.parsedVersion.version}. Looking for ${version.parsedVersion.version}`
        );
        if (localOcVersion.parsedVersion.version === version.parsedVersion.version) {
            core.info(`oc ${localOcVersion.parsedVersion.version} is already installed.`);
        }
        core.info("Versions did not match");

        return undefined;
    }

    static async runOcVersion(ocPath: string): Promise<BinaryTypeVersion> {
        let out = "";
        let err = "";
        const options: ExecOptions = {
            listeners: {
                stdout: (data: Buffer): void => {
                    out += data.toString();
                },
                stderr: (data: Buffer): void => {
                    err += data.toString();
                },
            },
        };

        let exitCode: number = await exec.exec(ocPath, [ "version", "--client=true" ], options);

        if (exitCode === 1) {
            core.debug("error executing oc version --short=true --client=true");
            // if oc version failed we're dealing with oc < 4.1
            exitCode = await exec.exec(ocPath, [ "version" ], options);
        }

        if (exitCode !== 0) {
            throw new Error(`${ocPath} exited with code ${exitCode}: ${err}`);
        }

        core.info(`Version output: ${out}`);

        return stringToVersion(out);
    }

    /**
   * Retrieve the version of oc CLI in cache
   *
   * @param version version to search in cache
   * @param runnerOS the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'.
   */
    static isVersionInCache(version: string): FindBinaryStatus {
        let cachePath: string;
        if (version) {
            cachePath = tc.find("oc", version);
            if (cachePath) {
                return { found: true, path: path.join(cachePath, utils.getOcBinaryFilename()) };
            }
        }
        return { found: false };
    }

    static async findOcFile(folder: string, file: string): Promise<string | undefined> {
        return new Promise<string | undefined>((resolve, reject) => {
            glob(`${folder}/**/${file}`, (err, res) => {
                if (err instanceof Error) {
                    reject(new Error(`Unable to find ${file} inside the directory ${folder}: ${err.stack}`));
                }
                else {
                    resolve(res[0]);
                }
            });
        });
    }
}
