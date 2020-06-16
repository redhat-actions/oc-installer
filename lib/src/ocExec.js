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
// eslint-disable-next-line no-unused-vars
const auth_1 = require("./auth");
const command_1 = require("./command");
const installer_1 = require("./installer");
const execHelper_1 = require("./utils/execHelper");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const openShiftUrl = core.getInput('openshift_server_url');
        const parameters = core.getInput('parameters');
        const version = core.getInput('version');
        const args = core.getInput('cmd');
        const useLocalOc = core.getInput('useLocalOc');
        const runnerOS = process.env.RUNNER_OS;
        core.debug(version);
        core.debug(runnerOS);
        core.debug(process.env.RUNNER_TEMP);
        if (!args) {
            return Promise.reject(new Error('Invalid cmd input. Insert at least one command to be executed.'));
        }
        const cmds = args.split('\n');
        const binaryVersion = execHelper_1.convertStringToBinaryVersion(version);
        const ocBinary = yield installer_1.Installer.installOc(binaryVersion, runnerOS, useLocalOc === 'true');
        if (ocBinary.found === false) {
            return Promise.reject(new Error(execHelper_1.getReason(ocBinary)));
        }
        const endpoint = auth_1.OcAuth.initOpenShiftEndpoint(openShiftUrl, parameters);
        yield auth_1.OcAuth.loginOpenshift(endpoint, ocBinary.path);
        for (const cmd of cmds) {
            // eslint-disable-next-line no-await-in-loop
            yield command_1.Command.execute(ocBinary.path, cmd);
        }
    });
}
exports.run = run;
run().catch(core.setFailed);
