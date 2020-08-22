"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledScraping = void 0;
const functions = require("firebase-functions");
const puppeteer = require("puppeteer");
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
async function scrape() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://www.google.com/search?q=covid+belgium+stats&oq=covid+belgium+stats&aqs=chrome..69i57j0l2.22234j0j7&sourceid=chrome&ie=UTF-8');
    const cases = await page.evaluate(() => {
        var _a;
        // Find header with covid text
        const headingElement = Array.from(document.querySelectorAll('[role=heading]'))
            .find(heading => heading.textContent === 'Cases overview');
        if (!((_a = headingElement === null || headingElement === void 0 ? void 0 : headingElement.parentElement) === null || _a === void 0 ? void 0 : _a.parentElement))
            return;
        // Go up two levels to get the div containing statistics, then get the 'total cases' boxes
        const totalCasesCollection = Array.from(headingElement.parentElement.parentElement.querySelectorAll('td'))
            .filter(td => {
            var _a;
            return ((_a = td.firstChild) === null || _a === void 0 ? void 0 : _a.textContent) === 'Total cases';
        });
        return {
            belgium: totalCasesCollection[0].children[1].innerText,
            world: totalCasesCollection[1].children[1].innerText
        };
    });
    await browser.close();
    return cases;
}
exports.scheduledScraping = functions.pubsub.schedule('every 12 hours').onRun(async () => {
    const cases = await scrape();
    const docRef = db.collection('covid-scrapes').doc();
    await docRef.set(cases);
});
//# sourceMappingURL=index.js.map