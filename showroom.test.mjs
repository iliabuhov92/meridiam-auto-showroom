import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright';

const origin = 'https://showroom.test';
const view = { width: 1280, height: 800 };
const resultDir = resolve('test-results');
const hingeNames = {
  fl: 'MERIDIAM_RIG_DOOR_FRONT_LEFT',
  fr: 'MERIDIAM_RIG_DOOR_FRONT_RIGHT',
  rl: 'MERIDIAM_RIG_DOOR_REAR_LEFT',
  rr: 'MERIDIAM_RIG_DOOR_REAR_RIGHT',
  trunk: 'MERIDIAM_RIG_TRUNK_LID'
};

async function snapshot(page, name) {
  await page.screenshot({ path: resolve(resultDir, name + '.png'), timeout: 60_000 });
}

async function showroom(browser, options) {
  const page = await browser.newPage({ reducedMotion: 'reduce', ...options });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.route(origin + '/**', route => {
    const pathname = new URL(route.request().url()).pathname;
    return route.fulfill({ path: resolve('dist', '.' + (pathname === '/' ? '/index.html' : pathname)) });
  });
  await page.goto(origin + '/?qa');
  await page.waitForFunction(() => window.__MERIDIAM_QA?.().drawCalls > 0, null, { timeout: 90_000 });
  return { page, errors };
}

test('BMW showroom changes the rendered GLB in desktop and mobile Chromium', { timeout: 540_000 }, async t => {
  await mkdir(resultDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  t.after(() => browser.close());
  const { page, errors } = await showroom(browser, { viewport: view });
  const scene = () => page.evaluate(() => window.__MERIDIAM_QA());
  const click = selector => page.locator(selector + ':visible').first().click({ timeout: 30_000 });
  const tab = section => click('[data-tab="' + section + '"]');
  await page.waitForFunction(() => window.__MERIDIAM_QA().yaw > 1.1);
  const exterior = await scene();
  assert.ok(exterior.paint.length && exterior.rims.length && exterior.seats.length);
  assert.ok(exterior.drawCalls > 400);
  assert.deepEqual(exterior.spoilers, [true, false]);
  assert.ok(exterior.lamps.drl.some(([value]) => value > 0));
  assert.ok(exterior.lamps.low.every(([value]) => value === 0));
  await snapshot(page, '01-desktop-sapphire');
  console.log('Verified default black paint, GLB and separate DRL meshes.');

  for (const color of ['white', 'blue', 'black']) {
    const before = (await scene()).paint;
    await click('[data-color="' + color + '"]');
    assert.notDeepEqual((await scene()).paint, before);
  }
  assert.deepEqual((await scene()).paint, exterior.paint);
  await click('[data-finish="matte"]');
  assert.ok((await scene()).paint.every(([, roughness, clearcoat]) => roughness > .6 && clearcoat === 0));
  await click('[data-finish="gloss"]');
  assert.deepEqual((await scene()).paint, exterior.paint);
  await click('[data-wheel="silver"]');
  assert.notDeepEqual((await scene()).rims, exterior.rims);
  await click('[data-wheel="dark"]');
  assert.deepEqual((await scene()).rims, exterior.rims);
  await click('[data-spoiler="high"]');
  assert.deepEqual((await scene()).spoilers, [false, true]);
  await click('[data-spoiler="low"]');
  assert.deepEqual((await scene()).spoilers, [true, false]);
  for (const finish of ['cloth', 'cognac', 'leather']) {
    const before = (await scene()).seats;
    await click('[data-seat="' + finish + '"]');
    assert.notDeepEqual((await scene()).seats, before);
  }
  console.log('Verified all paint, finish, rim, spoiler and upholstery selectors.');

  await tab('overview');
  for (const [button, name] of Object.entries(hingeNames)) {
    const before = (await scene()).hinges[name];
    await click('[data-part="' + button + '"]');
    await page.waitForFunction(name => window.__MERIDIAM_QA().hinges[name].angles.some(value => Math.abs(value) > .4), name);
    const after = (await scene()).hinges[name];
    const movement = Math.hypot(...after.meshes.map((value, index) => value - before.meshes[index]));
    // The world-axis bounds also include the glass and mirrors on the wider-opening doors.
    assert.ok(movement > .03 && movement < (button === 'trunk' ? .95 : 1.4), name + ' moved ' + movement);
    if (button === 'fr' || button === 'rl') {
      const trim = (await scene()).trim[button];
      const window = button === 'fr' ? 'Object_1104' : 'Object_1107';
      for (const mesh of [window, 'Object_1482', 'Object_223']) {
        assert.ok(trim.some(piece => piece.name === mesh + '_trim_' + button), mesh + ' missing from ' + name);
      }
    }
    assert.ok(Math.hypot(...after.pivot.map((value, index) => value - before.pivot[index])) < .005);
  }
  await snapshot(page, '02-open-doors');
  await click('#closeAll');
  await page.waitForFunction(names => names.every(name => window.__MERIDIAM_QA().hinges[name].angles.every(value => Math.abs(value) < .025)), Object.values(hingeNames));
  for (const name of ['front', 'side', 'rear', 'hero']) {
    const yaw = (await scene()).yaw;
    await click('[data-view="' + name + '"]');
    await page.waitForFunction(yaw => Math.abs(window.__MERIDIAM_QA().yaw - yaw) > .22, yaw);
  }
  const yaw = (await scene()).yaw;
  await page.mouse.move(460, 440);
  await page.mouse.down();
  await page.mouse.move(610, 440);
  await page.mouse.up();
  await page.waitForFunction(yaw => Math.abs(window.__MERIDIAM_QA().yaw - yaw) > .35, yaw);
  console.log('Verified five moving mesh groups, close all, four views and drag.');

  await tab('salon');
  for (const [name, x] of [['driver', -.24], ['passenger', -1.16], ['rear', -.46]]) {
    await click('[data-cabin="' + name + '"]');
    await page.waitForFunction(x => Math.abs(window.__MERIDIAM_QA().camera[0] - x) < .08, x);
  }
  await snapshot(page, '03-rear-cabin');
  await click('[data-cabin="driver"]');
  await click('[data-start-engine]');
  assert.notEqual((await scene()).audio, null);
  assert.ok(await page.evaluate(() => window.__MERIDIAM_AUDIO_QA()) > .004);
  console.log('Verified engine waveform offline. Live output state:', (await scene()).audio);
  assert.equal(await page.locator('#digitalText').textContent(), 'READY / P');
  assert.ok((await scene()).lamps.dash.some(([value]) => value > 0));
  await snapshot(page, '04-driver-cockpit');
  await click('[data-start-engine]');
  assert.equal((await scene()).audio, null);
  assert.equal(await page.locator('#digitalText').textContent(), 'OFF');

  await tab('light');
  await click('[data-light="low"]');
  assert.ok((await scene()).lamps.low.some(([value]) => value > 0));
  assert.ok((await scene()).beams.every(value => value > 0));
  await click('[data-light="off"]');
  assert.ok((await scene()).lamps.low.every(([value]) => value === 0));
  assert.ok((await scene()).lamps.drl.every(([value]) => value === 0));
  await click('[data-light="drl"]');
  assert.ok((await scene()).lamps.drl.some(([value]) => value > 0));
  for (const [control, group] of [['#interiorLight', 'cabin'], ['#rearLight', 'rear']]) {
    assert.ok((await scene()).lamps[group].some(([value]) => value > 0));
    await click(control);
    assert.ok((await scene()).lamps[group].every(([value]) => value === 0));
    await click(control);
  }
  for (const signal of ['left', 'right', 'hazard']) {
    await click('[data-signal="' + signal + '"]');
    await page.waitForFunction(signal => {
      const lamps = window.__MERIDIAM_QA().lamps.blink;
      const activeSides = new Set(lamps.filter(([value]) => value > 0).map(([, side]) => side));
      return signal === 'hazard' ? activeSides.size === 2 : activeSides.size === 1 && activeSides.has(signal);
    }, signal);
    await page.waitForFunction(() => window.__MERIDIAM_QA().lamps.blink.every(([value]) => value === 0));
  }
  await click('[data-signal="off"]');
  console.log('Verified front/rear/cabin light material changes, turn phase and START/STOP.');
  await tab('specs');
  assert.equal(await page.locator('#specs-body').isVisible(), true);
  await click('#contact');
  assert.equal(await page.locator('#contactModal').isVisible(), true);
  await click('#closeContact');
  assert.deepEqual(errors, []);
  await page.close();

  const mobile = await showroom(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  assert.equal(await mobile.page.locator('#contact').isVisible(), true);
  assert.ok(await mobile.page.locator('#contact').evaluate(element => element.getBoundingClientRect().right <= innerWidth));
  const panelToggle = mobile.page.locator('#mobilePanelToggle');
  await panelToggle.tap();
  assert.equal(await panelToggle.getAttribute('aria-expanded'), 'true');
  await mobile.page.locator('[data-color="blue"]').tap();
  assert.notDeepEqual(await mobile.page.evaluate(() => window.__MERIDIAM_QA().paint), exterior.paint);
  await mobile.page.locator('[data-color="black"]').tap();
  await panelToggle.tap();
  assert.equal(await panelToggle.getAttribute('aria-expanded'), 'false');
  const readYaw = () => mobile.page.evaluate(() => window.__MERIDIAM_QA().yaw);
  const mobileYaw = await readYaw();
  const cdp = await browser.contexts().at(-1).newCDPSession(mobile.page);
  const drag = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: x ? [{ x, y: 410 }] : [] });
  await drag('touchStart', 80);
  await drag('touchMove', 230);
  await drag('touchEnd');
  await mobile.page.waitForFunction(yaw => Math.abs(window.__MERIDIAM_QA().yaw - yaw) > .3, mobileYaw);
  await snapshot(mobile.page, '05-mobile');
  assert.deepEqual(mobile.errors, []);
  console.log('Verified touch drag, mobile configuration and fixed contact button.');
});
