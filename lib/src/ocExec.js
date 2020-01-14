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
// eslint-disable-next-line no-unused-vars
const auth_1 = require("./auth");
const command_1 = require("./command");
const installer_1 = require("./installer");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const openShiftUrl = core.getInput('openshift_server_url');
        const parameters = core.getInput('parameters');
        const version = core.getInput('version');
        const args = core.getInput('cmd');
        const runnerOS = process.env['RUNNER_OS'];
        core.debug(version);
        core.debug(runnerOS);
        core.debug(process.env['RUNNER_TEMP']);
        if (!args) {
            return Promise.reject('Invalid cmd input. Insert at least one command to be executed.');
        }
        const cmds = args.split('\n');
        const ocPath = yield installer_1.Installer.installOc(version, runnerOS);
        if (ocPath === null) {
            throw new Error('no oc binary found');
        }
        const endpoint = auth_1.OcAuth.initOpenShiftEndpoint(openShiftUrl, parameters);
        yield auth_1.OcAuth.loginOpenshift(endpoint, ocPath);
        for (const cmd of cmds) {
            yield command_1.Command.execute(ocPath, cmd);
        }
    });
}
exports.run = run;
run().catch(core.setFailed);
