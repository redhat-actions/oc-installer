"use strict";
/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
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
const exec = require("@actions/exec");
const split = require("argv-split");
const sub = require("substituter");
class Command {
    static execute(ocPath, args, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!ocPath) {
                return Promise.reject(new Error('Unable to find oc bundle'));
            }
            const cmdArgs = Command.prepareOcArgs(args);
            const exitCode = yield exec.exec(`${ocPath} ${cmdArgs}`, undefined, options);
            return exitCode;
        });
    }
    static prepareOcArgs(ocArgs) {
        const interpolatedArgs = sub(ocArgs, process.env);
        let args = split(interpolatedArgs);
        if (args[0] === 'oc' || args[0] === 'oc.exe') {
            args = args.slice(1);
        }
        return args.join(' ');
    }
}
exports.Command = Command;
