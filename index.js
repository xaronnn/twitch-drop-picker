const puppeteer = require('puppeteer');
require('dotenv').config();

let browser;
const cookies = [
	{
		domain: '.twitch.tv',
		name: 'auth-token',
		value: process.env.TWITCH_AUTH_TOKEN,
	},
];

async function getClaimedDrops(browser) {
	console.log('Looking for claimed drops 🕵️');

	const page = await browser.newPage();
	await page.setCookie(...cookies);
	const navigationPromise = page.waitForNavigation({ waitUntil: 'load' });
	await page.goto('https://www.twitch.tv/drops/inventory');
	await navigationPromise;

	let claimedDrops = [];
	let selector = 'p[data-test-selector=awarded-drop__drop-name]';
	try {
		await page.waitForSelector(selector, { timeout: 5000 });

		claimedDrops = await page.$$eval(selector, (items) =>
			[].map.call(items, (item) => item.innerText.toUpperCase())
		);

		console.log('Found ' + claimedDrops.length + ' claimed drops 🔍');
	} catch (e) {
		console.log('Failed to look for claimed drops ❌');
	}

	await page.close();
	return claimedDrops;
}

async function getDropData(browser) {
	const claimedDrops = await getClaimedDrops(browser);
	console.log('Looking for active streams 🕵️');

	const page = await browser.newPage();
	await page.goto('https://twitch.facepunch.com/');

	await page.waitForSelector('section.streamer-drops');
	dropData = await page.$$eval(
		'section.streamer-drops > div > div.drops-group > a.drop.is-live',
		(anchors) =>
			[].map.call(anchors, (a) => [
				a.href,
				a.innerText.match('\\nLIVE\\n(.*)\\n')[1],
			])
	);
	dropData = dropData.filter(
		(data) =>
			!claimedDrops.includes(data[1]) &&
			(process.env.IGNORED_DROPS == null ||
				!data[1].match(process.env.IGNORED_DROPS))
	);
	await page.close();
	console.log(dropData);
	return dropData;
}

async function claimDrops(browser) {
	console.log('Claiming drops 📦');
	const page = await browser.newPage();
	await page.setCookie(...cookies);
	const navigationPromise = page.waitForNavigation({ waitUntil: 'load' });
	await page.goto('https://www.twitch.tv/drops/inventory');
	await navigationPromise;

	let selector =
		'button[data-test-selector=DropsCampaignInProgressRewardPresentation-claim-button]';
	try {
		await page.waitForSelector(selector, { timeout: 2500 });

		const claimButtons = await page.$$(selector);
		for await (let btn of claimButtons) {
			await btn.click();
		}

		await page.waitForNavigation({ waitUntil: 'load' }),
			console.log('Finished claiming ' + claimButtons.length + ' drops ✔️');
	} catch (e) {
		console.log('No drops to claim 🕳️');
	}

	await page.close();
}

async function watch(browser, url) {
	const page = await browser.newPage();
	await page.setCookie(...cookies);
	await page.goto(url);
	await page.evaluate(() => {
		localStorage.setItem('mature', 'true');
		localStorage.setItem('video-muted', '{"default":false}');
		localStorage.setItem('volume', '0.5');
		localStorage.setItem('video-quality', '{"default":"160p30"}');
		window.stop();
	});
	const navigationPromise = page.waitForNavigation({ waitUntil: 'load' });
	await page.goto(url);
	await navigationPromise;

	let online = false;
	try {
		await page.waitForSelector(
			'[data-a-target=animated-channel-viewers-count]',
			{ timeout: 5500 }
		);
		online = true;
	} catch (e) {}

	if (online) {
		let overlayText = '';
		let overlaySelector = 'p[data-test-selector=content-overlay-gate__text]';
		try {
			await page.waitForSelector(overlaySelector, { timeout: 2500 });
			overlayText = await page.$eval(overlaySelector, (el) => el.innerText);
		} catch (e) {}

		if (overlayText.match('Error #4000')) {
			console.log('Failed to open stream ❌');
		} else {
			let watchTime = 15;
			let name = url.replace('https://www.twitch.tv/', '');
			console.log(`Watching ${name} for ${watchTime} minutes 👀`);
			await page.waitForTimeout(60000 * watchTime);
			claimDrops(browser);
		}
	} else {
		console.log('Channel is offline 📡');
	}

	await page.close();
}

(async () => {
	browser = await puppeteer.launch({
		headless: process.env.HEADLESS != 'false',
		executablePath: process.env.CHROME_PATH,
		args: ['--no-sandbox'],
	});

	let dropData;

	while (true) {
		dropData = await getDropData(browser);

		for await (let data of dropData) {
			await watch(browser, data[0]);
		}

		if (dropData.length == 0) {
			console.log('No streams available, waiting for 10 minutes ⏰');
			await new Promise((r) => setTimeout(r, 60000 * 10));
		}
	}
})();

process.on('SIGINT', async function () {
	console.log('Closing the browser 👋');
	await browser.close();
	process.exit();
});
