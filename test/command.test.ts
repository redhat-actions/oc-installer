import * as chai from 'chai';
import * as exec from '@actions/exec';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { Command } from '../src/command';

const expect = chai.expect;
chai.use(sinonChai);

/* global suite, setup, teardown, test */
/* eslint no-undef: "error" */

suite('Command', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('execute', () => {
        test('check if promise rejected if oc path is not defined', async () => {
            try {
                await Command.execute(undefined, 'args');
                expect.fail();
            } catch (err) {
                expect(err).equals('Unable to find oc bundle');
            }
        });

        test('check if promise rejected if oc path is empty', async () => {
            try {
                await Command.execute('', 'args');
                expect.fail();
            } catch (err) {
                expect(err).equals('Unable to find oc bundle');
            }
        });

        test('check if prepareOcArgs is called with right params', async () => {
            const prepareOcArgsStub = sandbox.stub(Command, 'prepareOcArgs');
            sandbox.stub(exec, 'exec').resolves(0);
            await Command.execute('path', 'args');
            expect(prepareOcArgsStub).calledOnceWith('args');
        });

        test('check if exec method is called with right command', async () => {
            sandbox.stub(Command, 'prepareOcArgs').returns('cmdArgs');
            const execStub = sandbox.stub(exec, 'exec').resolves(0);
            const result = await Command.execute('path', 'args');
            expect(execStub).calledOnceWith('path cmdArgs');
            expect(result).equals(0);
        });
    });

    suite('prepareOcArgs', () => {
        test('oc is cut off from final result string', () => {
            const res = Command.prepareOcArgs('oc version');
            expect(res).equals('version');
        });

        test('oc.exe is cut off from final result string', () => {
            const res = Command.prepareOcArgs('oc.exe version');
            expect(res).equals('version');
        });

        test('check if substituer substitute value', () => {
            process.env.TESTENV = 'TEST';
            const result = Command.prepareOcArgs('oc ${TESTENV}');
            expect(result).equals('TEST');
            delete process.env.TESTENV;
        });
    });
});