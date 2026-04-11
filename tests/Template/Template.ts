/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Tests template loading and compilation with variable substitution and object/array iteration.
 * @license Apache-2.0
 */
import { strict as assert } from 'assert';
import { createReadStream } from 'fs';
import { Readable, Writable } from 'stream';

import { Template as _Template } from '../../build/Vortez.js';
import Helpers from '../support/Helpers.js';
import TestSuite from '../support/TestSuite.js';
import SuiteTracker from '../support/SuiteTracker.js';

export class Template extends TestSuite {
    public readonly name = 'Template';
    private readonly tracker = new SuiteTracker('TEMPLATE');
    /** Tests the loading of text templates. */
    private async testTextTemplate(): Promise<void> {
        try {
            const output = await _Template.load(`${Helpers.assets}/template.txt`, {
                title: 'Hello',
                users: { Alice: true, Bob: false },
            });
            assert.ok(output.includes('<h1>Hello</h1>'));
            assert.ok(output.includes('<li>Alice:true</li>'));
            assert.ok(output.includes('<li>Bob:false</li>'));
            this.tracker.logTestResult('Template.load - Text template', true);
        } catch (error) {
            this.tracker.logTestResult('Template.load - Text template', false, error);
        }
    }
    /** Tests the loading of VHTML templates. */
    private async testVhtmlTemplate(): Promise<void> {
        try {
            const output = await _Template.load(`${Helpers.assets}/template.manual.vhtml`, {
                Url: '/vortez/dashboard',
                username: 'NetFeez',
                isLogged: true,
                currentPath: '/vortez/dashboard',
                role: 'user',
                adminType: 'super-user',
                userType: 'super-user',
                folder: {
                    'index.html': 'Página de inicio',
                    'secret.txt': 'Configuración de DB',
                    'style.css': 'Hoja de estilos',
                },
                emptyList: {},
            });
            assert.ok(output.includes('Existente: /vortez/dashboard'));
            assert.ok(output.includes('Fallback (string): Default_Activado'));
            assert.ok(output.includes('Tag Existente: /vortez/dashboard'));
            assert.ok(output.includes('[USER] Acceso restringido.'));
            assert.ok(output.includes('Coincidencia de ruta detectada.'));
            assert.ok(output.includes('Sesión iniciada como: NetFeez'));
            assert.ok(output.includes('* Nodo: index.html'));
            assert.ok(output.includes('[ALERTA] Archivo oculto detectado: Configuración de DB'));
            assert.ok(output.includes('Público: Hoja de estilos'));
            assert.ok(!output.includes('Este texto no debería aparecer'));
            assert.ok(output.includes('Coincidencia de tipo dinámica exitosa.'));
            this.tracker.logTestResult('Template.load - VHTML template', true);
        } catch (error) {
            this.tracker.logTestResult('Template.load - VHTML template', false, error);
        }
    }
    /** Tests the rejection of missing template files. */
    private async testMissingTemplate(): Promise<void> {
        try {
            await _Template.load(`${Helpers.assets}/missing-template.vhtml`, {});
            this.tracker.logTestResult('Template.load - Missing file rejected', false, new Error('Should have thrown'));
        } catch {
            this.tracker.logTestResult('Template.load - Missing file rejected', true);
        }
    }

    /** Tests fallback and pipe operators in template variables. */
    private async testFallbackAndPipe(): Promise<void> {
        try {
            const output = _Template.compile('<vortez-var name="missing" default="Fallback_Tag"/> {{missing || "Default_Activado"}}', {
            });
            assert.ok(output.includes('Fallback_Tag'));
            assert.ok(output.includes('Default_Activado'));
            this.tracker.logTestResult('Template.load - Fallback/Pipe operators', true);
        } catch (error) {
            this.tracker.logTestResult('Template.load - Fallback/Pipe operators', false, error);
        }
    }

    /**
     * Ensures var-each loop variables override globals and preserves legacy block behavior.
     */
    private async testEachBlockRegression(): Promise<void> {
        try {
            const output = _Template.compile('<vortez-each name="items">{{key}}={{value}};</vortez-each>', {
                items: { a: 1, b: 2 },
                key: 'GLOBAL_KEY',
                value: 'GLOBAL_VALUE',
            });
            assert.equal(output, 'a=1;b=2;');

            const missing = _Template.compile('<vortez-each name="missing">{{key}}</vortez-each>', {
                items: { a: 1 },
            });
            assert.ok(missing.startsWith('<p>'));
            assert.ok(missing.includes('missing'));
            assert.ok(missing.endsWith('</p>'));

            const invalidNames = _Template.compile('<vortez-each name="items" value="x" key="x">{{x}}</vortez-each>', {
                items: { a: 1 },
            });
            assert.ok(invalidNames.startsWith('<p>'));
            assert.ok(invalidNames.includes('items'));
            assert.ok(invalidNames.endsWith('</p>'));

            this.tracker.logTestResult('Template.compile - var-each regression checks', true);
        } catch (error) {
            this.tracker.logTestResult('Template.compile - var-each regression checks', false, error);
        }
    }

    /** Tests sync and stream compilation parity against the manual template fixture. */
    private async testStreamParity(): Promise<void> {
        try {
            const data = {
                Url: '/vortez/dashboard',
                username: 'NetFeez',
                isLogged: true,
                currentPath: '/vortez/dashboard',
                role: 'user',
                adminType: 'super-user',
                userType: 'super-user',
                folder: {
                    'index.html': 'Página de inicio',
                    'secret.txt': 'Configuración de DB',
                    'style.css': 'Hoja de estilos',
                },
                emptyList: {},
            };
            const syncOutput = await _Template.load(`${Helpers.assets}/template.manual.vhtml`, data);

            const streamOutput = await new Promise<string>((resolve, reject) => {
                let result = '';
                const outputStream = new Writable({
                    write(chunk, encoding, callback) {
                        result += chunk.toString();
                        callback();
                    },
                });

                outputStream.on('finish', () => resolve(result));
                outputStream.on('error', reject);

                const inputStream = createReadStream(`${Helpers.assets}/template.manual.vhtml`, { highWaterMark: 64 });
                const compiler = _Template.compileStream(inputStream, data);

                compiler.on('error', reject);
                compiler.pipe(outputStream);
            });

            assert.equal(streamOutput, syncOutput);
            this.tracker.logTestResult('Template.compileStream - Sync/stream parity', true);
        } catch (error) {
            this.tracker.logTestResult('Template.compileStream - Sync/stream parity', false, error);
        }
    }

    /** Tests stream compiler stability with extreme per-character chunking. */
    private async testStreamExtremeChunking(): Promise<void> {
        try {
            const template = [
                '<vortez-each name="folder" value="val" key="id">',
                '<vortez-if name="id" condition="==" expected="secret.txt">',
                'ALERT:{{val}}',
                '<vortez-else />',
                'OK:{{id}}={{val}}',
                '</vortez-if>',
                '</vortez-each>',
            ].join('');
            const data = {
                folder: {
                    'index.html': 'home',
                    'secret.txt': 'db-config',
                },
            };

            const expected = _Template.compile(template, data);
            const characterChunks = Array.from(template);

            const streamed = await new Promise<string>((resolve, reject) => {
                let result = '';
                const output = new Writable({
                    write(chunk, encoding, callback) {
                        result += chunk.toString();
                        callback();
                    },
                });

                output.on('finish', () => resolve(result));
                output.on('error', reject);

                const input = Readable.from(characterChunks);
                const compiler = _Template.compileStream(input, data);
                compiler.on('error', reject);
                compiler.pipe(output);
            });

            assert.equal(streamed, expected);
            this.tracker.logTestResult('Template.compileStream - Extreme chunking', true);
        } catch (error) {
            this.tracker.logTestResult('Template.compileStream - Extreme chunking', false, error);
        }
    }

    /** Tests malformed nested blocks are surfaced as template errors in stream mode. */
    private async testStreamMalformedNestedBlock(): Promise<void> {
        try {
            const malformed = '<vortez-each name="items"><vortez-if name="ok">{{ok}}</vortez-each>';
            const data = { items: { a: 1 }, ok: true };

            const streamed = await new Promise<string>((resolve, reject) => {
                let result = '';
                const output = new Writable({
                    write(chunk, encoding, callback) {
                        result += chunk.toString();
                        callback();
                    },
                });

                output.on('finish', () => resolve(result));
                output.on('error', reject);

                const input = Readable.from([malformed.slice(0, 20), malformed.slice(20)]);
                const compiler = _Template.compileStream(input, data);
                compiler.on('error', reject);
                compiler.pipe(output);
            });

            assert.ok(streamed.includes('the block is not closed'));
            this.tracker.logTestResult('Template.compileStream - Malformed nested block', true);
        } catch (error) {
            this.tracker.logTestResult('Template.compileStream - Malformed nested block', false, error);
        }
    }

    public async run(): Promise<TestSuite.SuiteResult> {
        this.tracker.reset();
        this.tracker.logger.log('\n&C6=== Template Test Suite ===\n');
        await this.testTextTemplate();
        await this.testVhtmlTemplate();
        await this.testMissingTemplate();
        await this.testFallbackAndPipe();
        await this.testEachBlockRegression();
        await this.testStreamParity();
        await this.testStreamExtremeChunking();
        await this.testStreamMalformedNestedBlock();
        this.tracker.printSummary();
        return this.tracker.getResult();
    }
}

export namespace Template {}

export default Template;
