import * as chai from 'chai';
import * as fs from 'fs';
import * as io from '@actions/io/lib/io';
import * as ioUtil from '@actions/io/lib/io-util';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as tc from '@actions/tool-cache';
import { Installer } from '../src/installer';

const expect = chai.expect;
chai.use(sinonChai);

/* global suite, setup, teardown, test */
/* eslint no-undef: "error" */

/*

suite('Installer', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('installOc', () => {
        test('check correct findBinaryStatus is returned when no version is input by user', async () => {
            const res = await Installer.installOc({ valid: false, reason: 'The action was run without any version as input.' }, 'OS');
            expect(res).to.throw().deep.equals({ found: false, reason: 'The action was run without any version as input.' });
        });

        test('check if getOcBundleUrl called if version is not URL', async () => {
            sandbox.stub(tc, 'find').returns(undefined);
            sandbox.stub(Installer, 'versionToCache' as any).returns('3.11.0');
            const getOcBundleStub = sandbox.stub(Installer, 'getOcURLToDownload').resolves('url');
            sandbox.stub(Installer, 'downloadAndExtract').resolves({ found: true, path:'ocbinary' });
            await Installer.installOc({ valid: true, type: 'number', value: '3.11' }, 'OS');
            expect(getOcBundleStub).calledOnceWithExactly({ valid: true, type: 'number', value: '3.11' }, 'OS');
        });

        test('check if getOcBundleUrl NOT called if version is cached', async () => {
            sandbox.stub(Installer, 'versionToCache' as any).returns('3.11.0');
            sandbox.stub(tc, 'find').returns('3.11.0');
            const getOcBundleStub = sandbox.stub(Installer, 'getOcURLToDownload').resolves(undefined);
            sandbox.stub(Installer, 'downloadAndExtract').resolves({ found: true, path:'ocbinary' });
            await Installer.installOc({ valid: true, type: 'number', value: '3.11.0' }, 'OS');
            expect(getOcBundleStub).not.called;
        });

        test('check if correct oc binary path is returned', async () => {
            sandbox.stub(Installer, 'versionToCache' as any).returns('3.11.0');
            sandbox.stub(tc, 'find').returns(undefined);
            sandbox.stub(Installer, 'getOcURLToDownload').resolves('url');
            const downloadExtractStub = sandbox.stub(Installer, 'downloadAndExtract').resolves({ found: true, path:'ocbinary' });
            const res = await Installer.installOc({ valid: true, type: 'number', value: '3.11' }, 'OS');
            expect(downloadExtractStub).calledOnceWith('url', 'OS', '3.11.0');
            expect(res).deep.equals({ found: true, path: 'ocbinary' });
        });
    });

    suite('downloadAndExtract', () => {
        test('return null if url is not valid', async () => {
            const res = await Installer.downloadAndExtract('', 'OS', '');
            expect(res).deep.equals({ found: false, reason: 'URL where to download oc is not valid.' });
        });

        test('check if extractZip is called when OS is Windows', async () => {
            sandbox.stub(tc, 'downloadTool').resolves('path');
            const extractZipStub = sandbox.stub(tc, 'extractZip').resolves('dir');
            sandbox.stub(ioUtil, 'exists').resolves(true);
            sandbox.stub(fs, 'chmodSync');
            await Installer.downloadAndExtract('url', 'Windows', '');
            expect(extractZipStub).calledOnceWith('path');
        });

        test('check if extractTar is called when OS is NOT Windows', async () => {
            sandbox.stub(tc, 'downloadTool').resolves('path');
            const extractZipStub = sandbox.stub(tc, 'extractZip');
            const extractTarStub = sandbox.stub(tc, 'extractTar').resolves('dir');
            sandbox.stub(ioUtil, 'exists').resolves(true);
            sandbox.stub(fs, 'chmodSync');
            await Installer.downloadAndExtract('url', 'Linux', '');
            expect(extractZipStub).not.called;
            expect(extractTarStub).calledOnceWith('path');
        });

        test('check if return NULL when ocbinary NOT exists', async () => {
            sandbox.stub(tc, 'downloadTool').resolves('path');
            sandbox.stub(tc, 'extractTar').resolves('dir');
            sandbox.stub(ioUtil, 'exists').resolves(false);
            const res = await Installer.downloadAndExtract('url', 'Linux', '');
            expect(res).deep.equals({ found: false, reason: `An error occurred while downloading and extracting oc binary from url. File undefined not found.` });
        });

        test('check if return correct binary with Windows', async () => {
            sandbox.stub(tc, 'downloadTool').resolves('path');
            sandbox.stub(tc, 'extractZip').resolves('dir');
            sandbox.stub(ioUtil, 'exists').resolves(true);
            sandbox.stub(Installer, 'findOcFile').resolves('dir/oc.exe');
            const fsStub = sandbox.stub(fs, 'chmodSync');
            const res = await Installer.downloadAndExtract('url', 'Windows', '');
            expect(fsStub).calledOnceWith('dir/oc.exe');
            expect(res).deep.equals({ found: true, path: 'dir/oc.exe' });
        });

        test('check if return correct binary with OS different than Windows', async () => {
            sandbox.stub(tc, 'downloadTool').resolves('path');
            sandbox.stub(tc, 'extractTar').resolves('dir');
            sandbox.stub(ioUtil, 'exists').resolves(true);
            sandbox.stub(Installer, 'findOcFile').resolves('dir/oc');
            const fsStub = sandbox.stub(fs, 'chmodSync');
            const res = await Installer.downloadAndExtract('url', 'Linux', '');
            expect(fsStub).calledOnceWith('dir/oc');
            expect(res).deep.equals({ found: true, path: 'dir/oc' });
        });
    });

    suite('getOcURLToDownload', () => {
        const ocUtils = {
            'openshiftV3BaseUrl': 'urlv3',
            'openshiftV4BaseUrl': 'urlv4'
        };

        test('check if latest url returned if request latest oc version', async () => {
            const latestStub = sandbox.stub(Installer, 'latest').resolves('urllatest');
            const res = await Installer.getOcURLToDownload({ valid: true, type: 'latest', value: 'latest' }, 'OS');
            expect(latestStub).calledOnceWith('OS');
            expect(res).equals('urllatest');
        });

        test('return null if version is not in valid format', async () => {
            const res = await Installer.getOcURLToDownload({ valid: false, reason: 'invalidversion' }, 'OS');
            expect(res).equals(undefined);
        });

        test('check if valid url is returned if major version is 3', async () => {
            sandbox.stub(Installer, 'getOcUtils').resolves(ocUtils);
            sandbox.stub(Installer, 'getOcBundleByOS').returns('ocbundle');
            const res = await Installer.getOcURLToDownload({ valid: true, type: 'number', value: '3.11' }, 'OS');
            expect(res).equals('urlv3/3.11/ocbundle');
        });

        test('check if valid url is returned if major version is 4', async () => {
            sandbox.stub(Installer, 'getOcUtils').resolves(ocUtils);
            sandbox.stub(Installer, 'getOcBundleByOS').returns('ocbundle');
            const res = await Installer.getOcURLToDownload({ valid: true, type: 'number', value: '4.1' }, 'OS');
            expect(res).equals('urlv4/4.1/ocbundle');
        });

        test('null if major version is neither 3 nor 4', async () => {
            sandbox.stub(Installer, 'getOcUtils').resolves(ocUtils);
            const res = await Installer.getOcURLToDownload({ valid: true, type: 'number', value: '2.1' }, 'OS');
            expect(res).equals(undefined);
        });

        test('null if unable to find oc bundle url', async () => {
            sandbox.stub(Installer, 'getOcUtils').resolves(ocUtils);
            const ocBundleStub = sandbox.stub(Installer, 'getOcBundleByOS').returns(null);
            const res = await Installer.getOcURLToDownload({ valid: true, type: 'number', value: '4.1' }, 'OS');
            expect(ocBundleStub).calledOnceWith('OS');
            expect(res).equals(undefined);
        });
    });

    suite('latest', () => {
        test('returns null if oc bundle url not found', async () => {
            sandbox.stub(Installer, 'getOcBundleByOS').returns(null);
            const res = await Installer.latest('OS');
            expect(res).equals(null);
        });

        test('check if latest oc version is returned if bundle url is found', async () => {
            const ocUtils = {
                'openshiftV3BaseUrl': 'urlv3',
                'openshiftV4BaseUrl': 'urlv4'
            };
            const ocBundleStub = sandbox.stub(Installer, 'getOcBundleByOS').returns('ocbundle');
            sandbox.stub(Installer, 'getOcUtils').resolves(ocUtils);
            const res = await Installer.latest('OS');
            expect(ocBundleStub).calledOnceWith('OS');
            expect(res).equals('urlv4/latest/ocbundle');
        });
    });

    suite('getOcBundleByOS', () => {
        test('check if correct url is returned if OS is Windows', async () => {
            const res = await Installer.getOcBundleByOS('Windows');
            expect(res).equals('windows/oc.zip');
        });

        test('check if correct url is returned if OS is Linux', async () => {
            const res = await Installer.getOcBundleByOS('Linux');
            expect(res).equals('linux/oc.tar.gz');
        });

        test('check if correct url is returned if OS is MacOS', async () => {
            const res = await Installer.getOcBundleByOS('macOS');
            expect(res).equals('macosx/oc.tar.gz');
        });

        test('returns null with invalid OS', async () => {
            const res = await Installer.getOcBundleByOS('OS');
            expect(res).equals(null);
        });
    });

    suite('#getlocalOcPath', () => {
        test('returns path found by which if no error occurs and there is no version as input', async () => {
          const whichStub = sandbox.stub(io, 'which').resolves('path');
          const res = await Installer.getLocalOcBinary({ valid: false, reason: 'invalidversion' });
          sinon.assert.calledWith(whichStub, 'oc', true);
          expect(res).deep.equals({ found: true, path: 'path' });
        });

        test('returns undefined if which fails retrieving oc path', async () => {
          sandbox.stub(io, 'which').throws();
          const res = await Installer.getLocalOcBinary({ valid: true, type: 'number', value: '1.1' });
          expect(res).deep.equals({ found: false });
        });

        test('returns nothing if oc path exists but oc version cannot be retrieved', async () => {
          sandbox.stub(io, 'which').resolves('path');
          const getOcStub = sandbox
            .stub(Installer, 'getOcVersion')
            .resolves({ valid: false, reason: `An error occured when retrieving version of oc CLI in path` });
          const res =  await Installer.getLocalOcBinary({ valid: true, type: 'number', value: '1.1' });
          sinon.assert.calledWith(getOcStub, 'path');
          expect(res).deep.equals({ found: false, reason: 'Oc installed has a different version of the one requested.' });
        });

        test('returns nothing if version found locally is not the one user wants to use', async () => {
          sandbox.stub(io, 'which').resolves('path');
          sandbox.stub(Installer, 'getOcVersion').resolves({ valid: true, type: 'number', value: '2.1' });
          const res = await Installer.getLocalOcBinary({ valid: true, type: 'number', value: '1.1' });
          expect(res).deep.equals({ found: false, reason: 'Oc installed has a different version of the one requested.' });
        });
    });

    suite('#getOcVersion', () => {
        let execOcStub: sinon.SinonStub;

        test('check if execute is called only once if succeed first time', async () => {
          execOcStub = sandbox.stub(Command, 'execute').resolves(0);
          await Installer.getOcVersion('path');
          sinon.assert.calledOnce(execOcStub);
        });

        test('check if execOcSync is called twice if first call returns nothing', async () => {
          execOcStub = sandbox.stub(Command, 'execute')
                                .onFirstCall()
                                .resolves(1)
                                .onSecondCall()
                                .resolves(0);
          await Installer.getOcVersion('path');
          sinon.assert.calledTwice(execOcStub);
        });

        test('returns undefined if both oc calls fail', async () => {
          execOcStub = sandbox.stub(Command, 'execute')
            .onFirstCall()
            .resolves(1)
            .onSecondCall()
            .resolves(1);
          const res = await Installer.getOcVersion('path');
          expect(res).deep.equals({ valid: false, reason: `An error occured when retrieving version of oc CLI in path` });
        });
    });
});

*/
