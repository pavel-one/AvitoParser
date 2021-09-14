const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const cheerio = require('cheerio');
const {createCursor} = require('ghost-cursor')
const fs = require("fs");
const __ = require('lodash');
const path = require("path");
const axios = require("axios");

const loggerOptions = {
    errorEventName: 'error',
    logDirectory: __dirname + '/../logs',
    fileNamePattern: 'parser-<DATE>.log',
    timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
    dateFormat: 'YYYY.MM.DD'
};

class ParserClass {
    link = 'https://www.avito.ru/moskva/predlozheniya_uslug/transport_perevozki/spetstekhnika-ASgBAgICAkSYC8SfAZoL3J8B?cd=1'
    base_url = 'https://www.avito.ru'
    cookies = []
    proxy = {}
    rootDir = __dirname + '/../'
    tmpPath = ''
    cookiesPath = ''
    tesseract
    resultsPath = this.rootDir + 'results/'
    imagesPath = this.rootDir + 'images/'

    logger = require('simple-node-logger').createRollingFileLogger(loggerOptions);

    lastPage = 1
    pageNumber = 1
    iterate = 0

    static build = async (pageNumber, proxy, tesseract) => {
        const parser = new ParserClass()
        parser.proxy = proxy
        parser.tesseract = tesseract

        parser.tmpPath = `${parser.rootDir}tmp/${parser.proxy.id}/`
        parser.cookiesPath = `${parser.rootDir}cookies/${parser.proxy.id}/cookies.json`

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

        parser.pageNumber = pageNumber
        parser.result = []


        try {
            parser.browser = await puppeteer.launch({
                headless: true,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--proxy-server=" + parser.proxy.host,
                    '--disable-dev-shm-usage'
                ],
                defaultViewport: {
                    width: 1366,
                    height: 768
                }
            })
        } catch (e) {
            await parser.browser.close()
            throw new Error('Умер броузер!')
        }

        return parser
    }

    init = async () => {
        this.page = await this.browser.newPage()

        await this.page.authenticate({
            username: this.proxy.username,
            password: this.proxy.password
        })
        await this.page.goto('https://google.com')
        await this.page.goto(this.base_url)

        if (fs.existsSync(this.cookiesPath)) {
            console.log('COOKIE IS FILE')
            const cookiesRaw = await fs.readFileSync(this.cookiesPath)
            await this.page.setCookie(...JSON.parse(cookiesRaw))
        } else {
            console.log('NEW COOKIE')
            await this.page.setCookie(...this.cookies)
        }

        await this.log('PREPARE')
        await this.wait(3)
        await this.page.goto(this.link)
        await this.wait(3)

        this.pages = await this.browser.pages()
        console.log('PAGES COUNT: ', this.pages.length)
    }

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
        for (let selectorName of selectors) {
            try {
                await cursor.click(selectorName)
                await this._parsePage()
                await this._writeToFile()
            } catch (e) {
                console.log('!! PARSE ERROR !!', e.message)
                this.logger.fatal(`!! PARSE ERROR !! ${e.message}`)
            }
            console.log('MOVE SELECTOR:', selectorName)
        }
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
            this.logger.fatal(`!! ERROR PARSER PAGE !! ${e.message}`)
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
            link: '',
            description: '',
            breadcrumbs: [],
            gallery: [],
            props: [],
        };

        //Хлебрные крошки
        const $breadcrumbs = $('.breadcrumbs [itemprop="itemListElement"]')
        if ($breadcrumbs.length) {
            await $breadcrumbs.each(async function () {
                let $a = await $(this).find('a')
                let $span = await $a.find('span')
                out.breadcrumbs.push({
                    name: await $span.text(),
                    link: await $a.attr('href')
                })
            })
        }

        //Галерея
        const $gallery = $('.gallery-img-wrapper')
        const self = this
        if ($gallery.length) {
            await $gallery.each(async function () {
                let $frame = await $(this).find('.gallery-img-frame')
                if ($frame.data('url')) {
                    const url = $frame.data('url')
                    let filename = url.split('/')
                    filename = filename[filename.length - 1]

                    const reg = new RegExp(/^(.*)\.(.*)$/g)
                    if (!reg.test(filename)) {
                        filename = filename + '.jpg'
                    }

                    try {
                        await self._saveImage(filename, url)
                    } catch (e) {
                        console.log('!! ERROR SAVE IMAGE !!', e)
                    }

                    out.gallery.push(
                        '/' + filename
                    )
                }
            })
        }

        //Параметры
        const $params = $('.item-params-list .item-params-list-item')
        if ($params.length) {
            await $params.each(async function () {
                const name = await $(this).find('.item-params-label').text()
                const fullText = await $(this).text()

                const value = fullText.replace(name)

                out.params.push({
                    name: name.trim(),
                    value: value.trim(),
                })
            })
        }

        //Описание
        const $description = $('.item-description-html')
        if ($description.length) {
            out.description = $description.html()
        }

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

    _saveImage = async (filename, link) => {
        const filePath = this.rootDir + 'images/' + filename

        try {
            const response = await axios({
                method: "GET",
                url: link,
                responseType: "stream",
            });
            const w = response.data.pipe(fs.createWriteStream(filePath))
            w.on('finish', () => {
                console.log('Successfully downloaded file!');
                w.close()
            })
        } catch (err) {
            console.log('!! ERROR DOWNLOAD FILE !!', err.message)
        }
    }

    _writeToFile = async () => {
        await fs.writeFileSync(`${this.resultsPath}${this.pageNumber}.output.json`, JSON.stringify(this.result), 'utf8');
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
        this.logger.info(message)
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
        this.logger.debug(`Ждем ${second} секунд`)
        return this.page.waitForTimeout(second * 1000)
    };

    close = async () => {
        await this.browser.close()
    };
}


module.exports = ParserClass
