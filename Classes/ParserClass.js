const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const adblock = require('puppeteer-extra-plugin-adblocker')
puppeteer.use(adblock({
    blockTrackers: true
}))

const PuppeteerVideoRecorder = require('puppeteer-video-recorder');

const cheerio = require('cheerio');
const {createWorker} = require('tesseract.js');
const {createCursor} = require('ghost-cursor')
const fs = require("fs");


class ParserClass {
    link = 'https://www.avito.ru/moskva/gruzoviki_i_spetstehnika?radius=0'
    base_url = 'https://www.avito.ru'
    cookies = [
        {
            'name': 'sessid',
            'value': '4820fba7f6169e2326a4b6eef4b95fbf.1629815805'
        }
    ]
    cookiesPath = __dirname + '/../cookies.json'
    tmpPath = __dirname + '/../tmp'

    static build = async () => {
        const parser = new ParserClass()

        parser.tesseract = await createWorker()
        await parser.tesseract.load();
        await parser.tesseract.loadLanguage('eng');
        await parser.tesseract.initialize('eng');

        parser.browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                // "--proxy-server=194.28.209.74:8000",
                '--disable-dev-shm-usage'
            ],
            defaultViewport: {
                width: 1920,
                height: 1080
            }
        })

        parser.page = await parser.browser.newPage()

        parser.video = new PuppeteerVideoRecorder();
        await parser.video.init(parser.page, parser.tmpPath + '/video')
        await parser.video.start();

        // await parser.page.authenticate({
        //     username: 'r423W1',
        //     password: 'hDzWcB'
        // })
        await parser.page.goto('https://google.com')
        await parser.page.goto(parser.base_url)
        // await parser.page.waitForNavigation()
        // await parser.wait(10)

        if (fs.existsSync(parser.cookiesPath)) {
            console.log('COOKIE IS FILE')
            const cookiesRaw = await fs.readFileSync(parser.cookiesPath)
            await parser.page.setCookie(...JSON.parse(cookiesRaw))
        } else {
            console.log('NEW COOKIE')
            await parser.page.setCookie(...parser.cookies)
        }

        await parser.log('PREPARE')
        await parser.wait(3)

        parser.pages = await parser.browser.pages()
        console.log('PAGES COUNT: ', parser.pages.length)

        return parser
    };

    checkPage = async () => {

        // await this.wait(3)
        // await cursor.click(selector)
        // await cursor.move('[data-marker="page-title/count"]')
        // await cursor.click()
        // await cursor.click()
        // await this.log('TESTING PAGE')
        //
        // // await this.video.stop();
        //
        // let allPages = await this.browser.pages()
        // console.log("PAGES LENGTH: ", allPages.length)
        //
        // this.page = allPages[0]
        // await this.page.bringToFront()
        // await this.log('PAGE 1')
        //
        // this.page = allPages[1]
        // await this.page.bringToFront()
        // await this.log('PAGE 2')
        //
        // this.page = allPages[2]
        // await this.page.bringToFront()
        // await this.log('PAGE 3')
        // // let page2 = allPages[0];
    };

    getAllPages = async () => {
        this.pages = await this.browser.pages();
        console.log('PAGES COUNT: ', this.pages.length)
    }

    changePage = async (page) => {
        this.page = page
        await this.log('CHANGE PAGE: ', page.title)
    }

    process = async () => {
        await this._preparePage()
    };

    _preparePage = async () => {
        await this.log('PREPARE PAGE')

        //Инициализация
        const selector = '[data-marker="catalog-serp"] > [data-marker="item"]'
        await this.page.goto(this.link)
        await this.page.waitForSelector(selector)

        const cursor = createCursor(this.page)
        await this.scrollDown(this.page)
        await cursor.toggleRandomMove(true)
        await cursor.move('[data-marker="page-title/count"]')
        await cursor.click('[data-marker="page-title/count"]')

        let $ = cheerio.load(await this.page.content())
        const elements = $('[data-marker="catalog-serp"] > [data-marker=item]');

        let selectors = []
        await elements.each(async function () {
            let id = await $(this).attr('id');
            let selector = '#' + id
            selectors.push(selector)
        })

        for (const selector of selectors) {
            try {
                await cursor.move(selector)
            } catch (e) {
                console.log('MOVE ERROR', e.message)
            }
            console.log('MOVE SELECTOR:', selector)
        }
    }

    randomInteger = (min, max) => {
        let rand = min + Math.random() * (max + 1 - min);
        return Math.floor(rand);
    }

    scrollDown = async (page) => {
        await page.evaluate(async () => {
            await new Promise((resolve, reject) => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 500);
            });
        });
    }

    log = async (message = '') => {
        console.log('PARSER: ', message)
        await this.page.screenshot({
            path: this.tmpPath + `/${message}.png`
        })

        const cookies = await this.page.cookies();
        await fs.writeFileSync(this.cookiesPath, JSON.stringify(cookies, null, 2));
    };

    wait = async (second = 15) => {
        console.log('WAIT: ', second)
        return this.page.waitForTimeout(second * 1000)
    };

    close = async () => {
        await this.video.stop()
        await this.browser.close()
        await this.tesseract.terminate()
    };
}


module.exports = ParserClass
