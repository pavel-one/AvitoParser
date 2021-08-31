const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const cheerio = require('cheerio');
const {createWorker} = require('tesseract.js');
const {createCursor} = require('ghost-cursor')
const fs = require("fs");
const __ = require('lodash');
const path = require("path");


class ParserClass {
    link = 'https://www.avito.ru/moskva/gruzoviki_i_spetstehnika?radius=0'
    base_url = 'https://www.avito.ru'
    cookies = [
        {
            'name': 'sessid',
            'value': '4820fba7f6169e2326a4b6eef4b95fbf.1629815805'
        }
    ]
    tmpPath = __dirname + '/../tmp'
    rootDir = __dirname + '/../'
    cookiesPath = this.rootDir + 'cookies.json'

    lastPage = 1
    pageNumber = 1
    iterate = 0

    static build = async () => {
        const parser = new ParserClass()

        fs.readdir(parser.tmpPath, (err, files) => {
            if (err) throw err;

            for (const file of files) {
                if (file === '.gitignore') {
                    continue;
                }

                console.log('Remove File: ' + file)

                fs.unlink(path.join(parser.tmpPath, file), err => {
                    if (err) throw err;
                });
            }
        });

        parser.result = []

        parser.tesseract = await createWorker()
        await parser.tesseract.load();
        await parser.tesseract.loadLanguage('eng');
        await parser.tesseract.initialize('eng');

        parser.browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--proxy-server=194.28.209.74:8000",
                '--disable-dev-shm-usage'
            ],
            defaultViewport: {
                width: 1920,
                height: 1080
            }
        })

        parser.page = await parser.browser.newPage()

        await parser.page.authenticate({
            username: 'r423W1',
            password: 'hDzWcB'
        })
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

    getAllPages = async () => {
        this.pages = await this.browser.pages();
        console.log('PAGES COUNT: ', this.pages.length)
    }

    getLastPage = async () => {
        const $ = cheerio.load(await this.page.content());
        let paginate = await $('[data-marker="pagination-button"]').find('span')
        return Number(await $(paginate[paginate.length - 2]).text())
    }

    changePage = async (page) => {
        this.page = page
        await this.page.bringToFront()
        await this.log('CHANGE PAGE: ' + await this.page.title())
    }

    process = async () => {
        await this._preparePage()
    };

    _preparePage = async () => {
        await this.log('PREPARE PAGE')

        //Инициализация
        const selector = '[data-marker="catalog-serp"] > [data-marker="item"]'
        await this.page.goto(this.link + `&p=${this.pageNumber}`)
        await this.page.waitForSelector(selector)

        //Работа с курсором
        const cursor = createCursor(this.page)
        await this.scrollDown(this.page)
        // await cursor.toggleRandomMove(true)
        await cursor.move('[data-marker="page-title/count"]')
        await cursor.click('[data-marker="page-title/count"]')

        //Ищем селекторы айтемов
        let $ = cheerio.load(await this.page.content())
        const elements = $('[data-marker="catalog-serp"] > [data-marker=item]');

        let selectors = []

        await elements.each(async function () {
            let id = await $(this).attr('id');
            let selector = '#' + id
            selectors.push(selector)
        })

        selectors = __.shuffle(selectors) //сортируем селекторы, чтобы кликать не по порядку

        //Кликаем по селекторам
        for (const selector of selectors) {
            try {
                await cursor.click(selector)
                await this._parsePage()
                await this._writeToFile()
            } catch (e) {
                console.log('!! PARSE ERROR !!', e.message)
            }
            console.log('MOVE SELECTOR:', selector)
        }

        //Логика завершения или смены страницы
        this.lastPage = this.getLastPage()

        if (this.pageNumber === this.lastPage) {
            return true
        }

        this.pageNumber++
        await this._preparePage()
    }

    _parsePage = async () => {
        const buttonSelector = '.item-phone-number > .button'
        const gallerySelector = '.item-description'

        await this.wait(this.randomInteger(5, 20))
        await this.getAllPages()

        if (this.pages.length < 3) {
            throw new Error('Промазали по элементу, пропускаем')
        }

        try {
            await this.changePage(this.pages[2])
            await this.log('[PAGE] ' + await this.page.title())

            const cursor = createCursor(this.page)
            await cursor.move(gallerySelector)
            await this.scrollDown(this.page)
            await this.wait(this.randomInteger(1, 10))
            await cursor.click(buttonSelector)
            await this.log('[PAGE] END ' + await this.page.title())

            await this._saveContentPage()
        } catch (e) {
            console.log('!! ERROR PARSER PAGE !!', e.message)
        }

        await this.page.close()
        await this.getAllPages()

        await this.changePage(this.pages[1])


    }

    _saveContentPage = async () => {
        const $ = cheerio.load(await this.page.content())
        const $image = $('[data-marker="phone-popup/phone-image"]')

        if (!$image.length) {
            throw new Error('Не удалось получить телефон')
        }

        const image = $image.attr('src')
        const base64Data = image.replace(/^data:image\/png;base64,/, "");

        let buffer = await Buffer.from(base64Data, 'base64')
        const {data: {text}} = await this.tesseract.recognize(buffer)
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
        out.link = await this.page.url()

        this.result.push(out);
    }

    _writeToFile = async () => {
        await fs.writeFileSync("output.json", JSON.stringify(this.result), 'utf8');
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
        message = await __(message).truncate(8)
        console.log('[LOG]: ', message)
        await this.page.screenshot({
            path: this.tmpPath + `/${this.iterate}_${this.pageNumber}.${message}.png`
        })
        this.iterate++

        const cookies = await this.page.cookies();
        await fs.writeFileSync(this.cookiesPath, JSON.stringify(cookies, null, 2));
    };

    wait = async (second = 15) => {
        console.log('WAIT: ', second)
        return this.page.waitForTimeout(second * 1000)
    };

    close = async () => {
        await this.browser.close()
        await this.tesseract.terminate()
    };
}


module.exports = ParserClass
