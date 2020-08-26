import * as functions from 'firebase-functions';
import * as puppeteer from 'puppeteer';
import * as moment from 'moment';
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function scrape() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://www.google.com/search?q=covid+belgium+stats&oq=covid+belgium+stats&aqs=chrome..69i57j0l2.22234j0j7&sourceid=chrome&ie=UTF-8');
  const cases = await page.evaluate(() => {
    // Find header with covid text
    const headingElement = Array.from(document.querySelectorAll('[role=heading]'))
      .find(heading => heading.textContent === 'Cases overview');
    if (!headingElement?.parentElement?.parentElement) return;
    // Go up two levels to get the div containing statistics, then get the 'total cases' boxes
    const totalCasesCollection = Array.from(headingElement.parentElement.parentElement.querySelectorAll('td'))
      .filter(td => {
        return td.firstChild?.textContent === 'Total cases'
      });

    return {
      date: moment().format('DD/MM/YYYY'),
      belgium: (totalCasesCollection[0].children[1] as HTMLElement).innerText,
      world: (totalCasesCollection[1].children[1] as HTMLElement).innerText
    }
  });
  await browser.close();
  return cases;
}

export const scheduledScraping = functions.pubsub.schedule('every 12 hours').onRun(async () => {
  const cases = await scrape();
  try {
    const docRef = db.collection('covid-scrapes').doc();
    await docRef.set(cases);
    functions.logger.log('Saved latest covid scrape');
    functions.logger.log('------');
    functions.logger.log(cases);
  } catch (error) {
    functions.logger.error(`Scraped data wasn't a valid object`);
    functions.logger.log('------');
    functions.logger.error(cases);
  }
});