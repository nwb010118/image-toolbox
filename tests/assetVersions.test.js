const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

function test(name, fn) {
  try { fn(); console.log('PASS: ' + name); } catch (err) { console.error('FAIL: ' + name); console.error(err.message); process.exitCode = 1; }
}

const script = path.join(__dirname, '..', 'tools', 'version_assets.py');
const python = ['python', 'python3', 'py'].map(function (cmd) {
  return { cmd: cmd, probe: spawnSync(cmd, ['--version']) };
}).find(function (c) { return c.probe.status === 0; });

if (!python) {
  console.log('SKIP: python not found, cannot check asset versions');
} else {
  test('every local script and stylesheet URL carries an up-to-date ?v= content hash (run: python tools/version_assets.py)', function () {
    const result = spawnSync(python.cmd, [script, '--check'], { encoding: 'utf8' });
    assert.strictEqual(result.status, 0, result.stdout + result.stderr);
  });
}
