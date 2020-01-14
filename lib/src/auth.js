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
const constants_1 = require("./constants");
const command_1 = require("./command");
class OcAuth {
    static initOpenShiftEndpoint(openShiftServer, parameters) {
        if (!openShiftServer) {
            throw new Error('Invalid Openshift cluster URL.');
        }
        if (!parameters) {
            throw new Error('Invalid parameters workflow input.');
        }
        const paramsJSON = JSON.parse(parameters);
        let scheme = '';
        if (paramsJSON['username'] && paramsJSON['password']) {
            scheme = constants_1.BASIC_AUTHENTICATION;
        }
        else if (paramsJSON['apitoken']) {
            scheme = constants_1.TOKEN_AUTHENTICATION;
        }
        else {
            throw new Error('There are no sufficient parameters to authenticate to an Openshift cluster.');
        }
        return {
            serverUrl: openShiftServer,
            parameters: paramsJSON,
            scheme: scheme
        };
    }
    static loginOpenshift(endpoint, ocPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!endpoint) {
                core.debug('Null endpoint is not allowed');
                return Promise.reject('Endpoint is not valid');
            }
            // potential values for EndpointAuthorization:
            //
            // parameters:{"apitoken":***}, scheme:'Token'
            // parameters:{"username":***,"password":***}, scheme:'UsernamePassword'
            // parameters:{"kubeconfig":***}, scheme:'None'
            const authType = endpoint.scheme;
            let useCertificateOrSkipTls = OcAuth.getCertificateAuthorityFile(endpoint);
            if (useCertificateOrSkipTls === '') {
                useCertificateOrSkipTls = OcAuth.skipTlsVerify(endpoint);
            }
            switch (authType) {
                case constants_1.BASIC_AUTHENTICATION:
                    const username = endpoint.parameters['username'];
                    const password = endpoint.parameters['password'];
                    yield command_1.Command.execute(ocPath, `login ${useCertificateOrSkipTls} -u ${username} -p ${password} ${endpoint.serverUrl}`);
                    break;
                case constants_1.TOKEN_AUTHENTICATION:
                    const args = `login ${useCertificateOrSkipTls} --token ${endpoint.parameters['apitoken']} ${endpoint.serverUrl}`;
                    yield command_1.Command.execute(ocPath, args);
                    break;
                case constants_1.NO_AUTHENTICATION:
                    // authKubeConfig(endpoint.parameters['kubeconfig'], runnerOS);
                    break;
                default:
                    throw new Error(`unknown authentication type '${authType}'`);
            }
        });
    }
    static getCertificateAuthorityFile(endpoint) {
        let certificateFile = '';
        if (endpoint.parameters['certificateAuthorityFile']) {
            certificateFile = `--certificate-authority=${endpoint.parameters['certificateAuthorityFile']}`;
        }
        return certificateFile;
    }
    static skipTlsVerify(endpoint) {
        let skipTlsVerify = '';
        if (endpoint.parameters['acceptUntrustedCerts'] === 'true') {
            skipTlsVerify = '--insecure-skip-tls-verify';
        }
        return skipTlsVerify;
    }
}
exports.OcAuth = OcAuth;
