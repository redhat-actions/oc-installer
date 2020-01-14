import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { BASIC_AUTHENTICATION, TOKEN_AUTHENTICATION } from '../src/constants';
// eslint-disable-next-line no-unused-vars
import { OcAuth, OpenShiftEndpoint } from '../src/auth';
import { Command } from '../src/command';

const expect = chai.expect;
chai.use(sinonChai);

/* global suite, setup, teardown, test */
/* eslint no-undef: "error" */

suite('OcAuth', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('initOpenShiftEndpoint', () => {
        test('reject promise if server is not valid', async () => {
            try {
                OcAuth.initOpenShiftEndpoint(null, 'params');
                expect.fail();
            } catch (err) {
                expect((err as Error).message).equals('Invalid Openshift cluster URL.');
            }
        });

        test('reject promise if there are no parameters', async () => {
            try {
                OcAuth.initOpenShiftEndpoint('server', '');
                expect.fail();
            } catch (err) {
                expect((err as Error).message).equals('Invalid parameters workflow input.');
            }
        });

        test('check if correct endpoint is created if scheme is basic_authentication', async () => {
            const params = '{"username": "username", "password": "password", "acceptUntrustedCerts": "true"}';
            const json = {
                serverUrl: 'server',
                parameters: JSON.parse(params),
                scheme: BASIC_AUTHENTICATION
            };
            const res = OcAuth.initOpenShiftEndpoint('server', params);
            expect(res).deep.equals(json);
        });

        test('check if correct endpoint is created if scheme is token_authentication', async () => {
            const params = '{"apitoken": "token", "acceptUntrustedCerts": "true"}';
            const json = {
                serverUrl: 'server',
                parameters: JSON.parse(params),
                scheme: TOKEN_AUTHENTICATION
            };
            const res = OcAuth.initOpenShiftEndpoint('server', params);
            expect(res).deep.equals(json);
        });

        test('reject promise if there are no sufficient params for authentication', async () => {
            const params = '{"acceptUntrustedCerts": "true"}';
            try {
                OcAuth.initOpenShiftEndpoint('server', params);
                expect.fail();
            } catch (err) {
                expect((err as Error).message).equals('There are no sufficient parameters to authenticate to an Openshift cluster.');
            }
        });
    });

    suite('loginOpenshift', () => {
        const endpoint: OpenShiftEndpoint = {
            serverUrl: 'url',
            scheme: BASIC_AUTHENTICATION,
            parameters: JSON.parse('{"key": "value"}')
        };

        test('reject promise if endpoint has no a value', async () =>  {
            try {
                await OcAuth.loginOpenshift(null, 'path');
                expect.fail();
            } catch (err) {
                expect(err).equals('Endpoint is not valid');
            }
        });

        test('check if getCertificateAuthority is called with correct endpoint', async () => {
            const certificateStub = sandbox.stub(OcAuth, 'getCertificateAuthorityFile').returns('flag');
            sandbox.stub(Command, 'execute').resolves(0);
            await OcAuth.loginOpenshift(endpoint, 'path');
            expect(certificateStub).calledOnceWith(endpoint);
        });

        test('check if skipTlsVerify is called with correct endpoint if getCertificateAuthorityFile returns no flag', async () => {
            sandbox.stub(OcAuth, 'getCertificateAuthorityFile').returns('');
            const skipTlsStub = sandbox.stub(OcAuth, 'skipTlsVerify').returns('');
            sandbox.stub(Command, 'execute').resolves(0);
            await OcAuth.loginOpenshift(endpoint, 'path');
            expect(skipTlsStub).calledOnceWith(endpoint);
        });

        test('check if skipTlsVerify is NOT called if getCertificateAuthorityFile returns valid flag', async () => {
            sandbox.stub(OcAuth, 'getCertificateAuthorityFile').returns('flag');
            const skipTlsStub = sandbox.stub(OcAuth, 'skipTlsVerify').returns('');
            sandbox.stub(Command, 'execute').resolves(0);
            await OcAuth.loginOpenshift(endpoint, 'path');
            expect(skipTlsStub).not.called;
        });

        test('check if correct oc command is executed with basic authentication type', async () => {
            const params = '{"username": "username", "password": "password", "acceptUntrustedCerts": "true"}';
            endpoint.parameters = JSON.parse(params);

            sandbox.stub(OcAuth, 'getCertificateAuthorityFile').returns('');
            sandbox.stub(OcAuth, 'skipTlsVerify').returns('');
            const commandStub = sandbox.stub(Command, 'execute').resolves(0);
            await OcAuth.loginOpenshift(endpoint, 'path');
            expect(commandStub).calledOnceWith('path', 'login  -u username -p password url');
        });

        test('check if correct oc command is executed with token authentication type', async () => {
            const params = '{"apitoken": "token", "acceptUntrustedCerts": "true"}';
            endpoint.parameters = JSON.parse(params);
            endpoint.scheme = TOKEN_AUTHENTICATION;

            sandbox.stub(OcAuth, 'getCertificateAuthorityFile').returns('');
            sandbox.stub(OcAuth, 'skipTlsVerify').returns('');
            const commandStub = sandbox.stub(Command, 'execute').resolves(0);
            await OcAuth.loginOpenshift(endpoint, 'path');
            expect(commandStub).calledOnceWith('path', 'login  --token token url');
        });

        test('check if new error is thrown if no vail authentication type is found', async () => {
            const params = '{"acceptUntrustedCerts": "true"}';
            endpoint.parameters = JSON.parse(params);
            endpoint.scheme = 'invalidscheme';

            sandbox.stub(OcAuth, 'getCertificateAuthorityFile').returns('');
            sandbox.stub(OcAuth, 'skipTlsVerify').returns('');
            const loginOpenshiftSpy = sandbox.stub(OcAuth, 'loginOpenshift');
            try {
                await loginOpenshiftSpy(endpoint, 'path');
            } catch (err) {}
            expect(loginOpenshiftSpy).throw;
        });
    });

    suite('getCertificateAuthorityFile', () => {
        test('return empty string if param certificateAuthorityFile NOT exists', () => {
            const params = '{"acceptUntrustedCerts": "true"}';
            const endpoint: OpenShiftEndpoint = {
                serverUrl: 'server',
                parameters: JSON.parse(params),
                scheme: BASIC_AUTHENTICATION
            };
            const res = OcAuth.getCertificateAuthorityFile(endpoint);
            expect(res).equals('');
        });

        test('return correct value if param certificateAuthorityFile exists', () => {
            const params = '{"certificateAuthorityFile": "path"}';
            const endpoint: OpenShiftEndpoint = {
                serverUrl: 'server',
                parameters: JSON.parse(params),
                scheme: BASIC_AUTHENTICATION
            };
            const res = OcAuth.getCertificateAuthorityFile(endpoint);
            expect(res).equals('--certificate-authority=path');
        });
    });

    suite('skipTlsVerify', () => {
        test('return empty string if param acceptUntrustedCerts NOT exists', () => {
            const params = '{"certificateAuthorityFile": "path"}';
            const endpoint: OpenShiftEndpoint = {
                serverUrl: 'server',
                parameters: JSON.parse(params),
                scheme: BASIC_AUTHENTICATION
            };
            const res = OcAuth.skipTlsVerify(endpoint);
            expect(res).equals('');
        });

        test('return empty string if param acceptUntrustedCerts exists and its value is false', () => {
            const params = '{"acceptUntrustedCerts": "false"}';
            const endpoint: OpenShiftEndpoint = {
                serverUrl: 'server',
                parameters: JSON.parse(params),
                scheme: BASIC_AUTHENTICATION
            };
            const res = OcAuth.skipTlsVerify(endpoint);
            expect(res).equals('');
        });

        test('return correct value if param acceptUntrustedCerts exists', () => {
            const params = '{"acceptUntrustedCerts": "true"}';
            const endpoint: OpenShiftEndpoint = {
                serverUrl: 'server',
                parameters: JSON.parse(params),
                scheme: BASIC_AUTHENTICATION
            };
            const res = OcAuth.skipTlsVerify(endpoint);
            expect(res).equals('--insecure-skip-tls-verify');
        });
    });
});