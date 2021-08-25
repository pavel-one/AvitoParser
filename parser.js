const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

const cheerio = require('cheerio');
const {createWorker} = require('tesseract.js');
const fs = require("fs");
// const {scrollPageToBottom} = require("puppeteer-autoscroll-down");
const tesseract = createWorker();

const avitoLink = 'https://www.avito.ru/moskva/gruzoviki_i_spetstehnika?radius=0';

(async () => {
    await tesseract.load();
    await tesseract.loadLanguage('eng');
    await tesseract.initialize('eng');
})();

const base_url = 'https://www.avito.ru';

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--proxy-server=194.28.209.74:8000"
        ],
        defaultViewport: {
            width: 1920,
            height: 1080
        }
    });
    const page = await browser.newPage();
    await page.authenticate({username: 'r423W1', password: 'hDzWcB'})
    await page.goto('https://google.com');

    const avitoPage = await browser.newPage();

    // console.log(`Тестирование эдблока`)
    // await avitoPage.goto('https://www.vanityfair.com')
    // await avitoPage.waitForTimeout(1000)
    // await avitoPage.screenshot({ path: 'tmp/adblocker.png', fullPage: true })
    //
    // console.log(`Тестирование стелса`)
    // await avitoPage.goto('https://bot.sannysoft.com')
    // await avitoPage.waitForTimeout(5000)
    // await avitoPage.screenshot({ path: 'tmp/stealth.png', fullPage: true })

    await preparePage(avitoPage)
    const lastPageNumber = await getLastPage(avitoPage);
    console.log('LAST PAGE NUMBER', lastPageNumber)

    for (let i = 1; i < lastPageNumber; i++) {
        console.log('Получаем страницу #' + i);
        const links = await getLinks(avitoPage, i);
        console.log('Количество ссылок на странице', links.length)

        let out = [];
        for (const item of links) {
            try {
                const data = await parsePage(item, avitoPage)
                out.push(data)

                await fs.writeFileSync("output.json", JSON.stringify(out), 'utf8');
            } catch (e) {
                console.log('ERROR PARSING: ', e)
            }
        }
    }

    await browser.close()
    await tesseract.terminate()
})();

async function getLastPage(page) {
    await page.goto(avitoLink)
    await page.screenshot({
        path: 'tmp/LastPageNumber.png'
    })
    const $ = cheerio.load(await page.content());
    let paginate = await $('[data-marker="pagination-button"]').find('span')
    return Number(await $(paginate[paginate.length - 2]).text())
}

async function preparePage(page) {
    await page.goto(base_url);
    const cookies = [
        {
            'name': 'sessid',
            'value': '4820fba7f6169e2326a4b6eef4b95fbf.1629815805'
        }
    ];

    await page.setCookie(...cookies)
    await page.screenshot({
        path: 'tmp/prepare.jpg'
    })
    await page.mouse.move(randomInteger(100, 700), randomInteger(100, 400))
    await page.mouse.move(randomInteger(100, 1000), randomInteger(100, 1000))
    await wait(randomInteger(1, 15));
}

async function getLinks(page, pageNumber = 1) {
    await page.goto(avitoLink + '?page=' + pageNumber)
    await page.mouse.move(randomInteger(300, 550), randomInteger(100, 400));
    await page.mouse.down();
    await page.mouse.move(randomInteger(100, 240), randomInteger(100, 400));
    await page.mouse.up();
    await wait(10);
    // await scrollPageToBottom(page)
    await page.screenshot({path: 'tmp/launch.jpg'})

    const $ = cheerio.load(await page.content());

    let links = [];
    await $('[data-marker="catalog-serp"] > [data-marker=item]').each(async function () {
        let link = await $(this).find('a').first().attr('href');
        links.push(link);
    });

    return links;
}

async function parsePage(link, page) {
    console.log('Парсим ', link)
    await page.goto(base_url + link)
    await wait(randomInteger(5, 15))

    await page.screenshot({
        path: 'tmp/' + link.replace(/\//g, '_') + '.jpg'
    })

    await page.mouse.move(randomInteger(300, 550), randomInteger(100, 400));
    await page.mouse.down();
    await page.mouse.move(randomInteger(100, 240), randomInteger(100, 400));
    await page.mouse.up();
    // await scrollPageToBottom(page)
    await page.click('.item-phone-number > .button');
    await wait(randomInteger(5, 15))

    const $ = cheerio.load(await page.content())
    const image = $('[data-marker="phone-popup/phone-image"]').attr('src')
    const base64Data = image.replace(/^data:image\/png;base64,/, "");

    let buffer = await Buffer.from(base64Data, 'base64')
    const {data: {text}} = await tesseract.recognize(buffer)
    const phone = text.replace(/\s|-/g, '')

    let out = {
        title: '',
        price: 0,
        phone: '',
        saler: '',
        salerName: '',
        address: '',
        date: '',
        link: ''
    };

    out.title = $('.title-info-title-text').text()
    out.price = $('.js-item-price').attr('content')
    out.phone = phone
    out.saler = $('[data-marker="seller-info/name"]').find('a').first().text()
    out.salerName = $('.seller-info-value').text()
    out.address = $('.item-address__string').text()
    out.date = $('.title-info-metadata-item-redesign').text()
    out.link = base_url + link

    return out;
}

function randomInteger(min, max) {
    let rand = min + Math.random() * (max + 1 - min);
    return Math.floor(rand);
}

async function wait(second = 5) {
    console.log('Ждем ' + second + ' секунд');
    await new Promise(resolve => setTimeout(resolve, second * 1000));
}
