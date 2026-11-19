import assert from 'node:assert/strict';
import { connect } from 'node:net';
import { test } from 'node:test';
import { CLOUD_FIXTURE, makeCloudPreparation } from '../src/cloud.js';

const exact = '  수정 전: 버튼\n수정 후: 배송지 변경, 버튼\n';
const route = 'https://firebasevertexai.googleapis.com/v1beta/projects/replay-simulation-invalid/models/gemini-3.5-flash-lite:generateContent';
const simulatedResponse = () => Response.json({
  candidates: [{ content: { role: 'model', parts: [{ text: 'Simulated response' }] }, finishReason: 'STOP' }],
});

function simulate(t, respond = simulatedResponse) {
  // Never delegates to real fetch. Retain the SDK request only in the mock's memory.
  const fetch = t.mock.method(globalThis, 'fetch', respond);
  return fetch.mock;
}

test('native network is denied in this runner', async () => {
  assert.equal(process.permission?.has('net'), false);
  const socket = connect({ host: '127.0.0.1', port: 65534 });
  const error = await new Promise(resolve => socket.once('error', resolve));
  assert.equal(error.code, 'ERR_ACCESS_DENIED');
});

test('real Firebase SDK dispatches exactly the approved fixture to the Google AI proxy route', async t => {
  const calls = simulate(t);
  const cloud = makeCloudPreparation();
  assert.equal(CLOUD_FIXTURE, exact);
  assert.equal(cloud.approve(exact), true);
  assert.equal(calls.callCount(), 0, 'approval alone does not dispatch');
  assert.deepEqual(await cloud.send(exact), { status: 'simulated' });
  assert.equal(calls.callCount(), 1);
  const [url, options] = calls.calls[0].arguments;
  assert.equal(url, route);
  assert.equal(options.method, 'POST');
  assert.equal(options.headers.get('content-type'), 'application/json');
  assert.equal(options.headers.get('x-firebase-appid'), null);
  assert.equal(options.headers.get('authorization'), null);
  assert.equal(options.headers.get('x-firebase-appcheck'), null);
  assert.deepEqual(JSON.parse(options.body), {
    generationConfig: {},
    safetySettings: [],
    contents: [{ role: 'user', parts: [{ text: exact }] }],
  });
  assert.deepEqual(await cloud.send(exact), { status: 'not-approved' });
  assert.equal(calls.callCount(), 1, 'approval cannot be replayed');
});

test('preconsent, raw input, and edited text never dispatch', async t => {
  const calls = simulate(t);
  const cloud = makeCloudPreparation();
  assert.deepEqual(await cloud.send(exact), { status: 'not-approved' });
  assert.equal(cloud.approve('SYNTHETIC_RAW_LOG_CANARY'), false);
  assert.deepEqual(await cloud.send('SYNTHETIC_RAW_LOG_CANARY'), { status: 'not-approved' });
  assert.equal(cloud.approve(exact.trim()), false);
  cloud.approve(exact);
  assert.deepEqual(await cloud.send(exact + ' '), { status: 'not-approved' });
  assert.deepEqual(await cloud.send(exact), { status: 'not-approved' });
  cloud.approve(exact);
  cloud.revoke();
  assert.deepEqual(await cloud.send(exact), { status: 'not-approved' });
  assert.equal(calls.callCount(), 0);
});

test('reapproval cannot revive an old send before the SDK dispatch', async t => {
  const calls = simulate(t);
  const cloud = makeCloudPreparation();
  cloud.approve(exact);
  const stale = cloud.send(exact);
  cloud.revoke();
  cloud.approve(exact);
  assert.deepEqual(await stale, { status: 'revoked' });
  assert.equal(calls.callCount(), 0);
  assert.deepEqual(await cloud.send(exact), { status: 'simulated' });
  assert.equal(calls.callCount(), 1);
});

test('revocation aborts the SDK transport signal and drops a late response', { timeout: 2000 }, async t => {
  const reached = Promise.withResolvers();
  const pending = Promise.withResolvers();
  const calls = simulate(t, (_url, { signal }) => {
    reached.resolve(signal);
    return pending.promise; // Intentionally ignore abort to exercise the late-response guard.
  });
  const cloud = makeCloudPreparation();
  cloud.approve(exact);
  const result = cloud.send(exact);
  const signal = await reached.promise;
  assert.equal(signal.aborted, false);
  assert.deepEqual(await cloud.send(exact), { status: 'not-approved' });
  cloud.revoke();
  assert.equal(signal.aborted, true);
  pending.resolve(simulatedResponse());
  assert.deepEqual(await result, { status: 'revoked' });
  assert.equal(calls.callCount(), 1);
});

test('provider failure returns only a fixed status, without console output', async t => {
  const warn = t.mock.method(console, 'warn', () => {});
  const error = t.mock.method(console, 'error', () => {});
  const log = t.mock.method(console, 'log', () => {});
  const calls = simulate(t, () => Response.json({ error: { message: 'SYNTHETIC_PROVIDER_ERROR_CANARY' } }, { status: 500 }));
  const cloud = makeCloudPreparation();
  cloud.approve(exact);
  assert.deepEqual(await cloud.send(exact), { status: 'failed' });
  assert.equal(calls.callCount(), 1);
  assert.equal(warn.mock.callCount() + error.mock.callCount() + log.mock.callCount(), 0);
});

test('dispatch is refused when network permissions are reported open', async t => {
  const calls = simulate(t);
  const permission = t.mock.method(process.permission, 'has', resource => resource === 'net');
  const cloud = makeCloudPreparation();
  cloud.approve(exact);
  assert.deepEqual(await cloud.send(exact), { status: 'network-guard-required' });
  assert.equal(permission.mock.callCount(), 1);
  assert.equal(calls.callCount(), 0);
});
