import { spawn } from 'node:child_process';
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex >= 0 ? args[portIndex + 1] : '3000';
const child = spawn('node', ['node_modules/next/dist/bin/next', 'dev', '--hostname', '0.0.0.0', '--port', port], { stdio: 'inherit' });
child.on('exit', code => process.exit(code ?? 0));
