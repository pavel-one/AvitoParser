const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const {createWorker} = require('tesseract.js');
const fs = require("fs");
const tesseract = createWorker();

(async () => {
    await tesseract.load();
    await tesseract.loadLanguage('eng');
    await tesseract.initialize('eng');
})();

const base_url = 'https://www.avito.ru';

(async () => {
    const browser = await puppeteer.launch({
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--proxy-server=194.28.209.74:8000"
        ],
        executablePath: '/usr/bin/chromium-browser',
        defaultViewport: {
            width: 1920,
            height: 1080
        }
    });
    const page = await browser.newPage();
    await page.authenticate({username: 'r423W1', password: 'hDzWcB'})
    await page.goto('https://google.com');

    const avitoPage = await browser.newPage();
    await preparePage(avitoPage)

    const links = await getLinks(avitoPage);

    console.log('LINKS ITEMS', links.length)

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

    await browser.close()
    await tesseract.terminate()
})();

async function preparePage(page) {
    await page.goto(base_url);
    const cookies = [
        {
            'name': 'sx',
            'value': 'H4sIAAAAAAACA52TQXbqMAxF95JxB4qjJEp3Q5QgQIADKhHQ071%2FpefQwvB35oF9bb37%2FFlQ087T3E9rIjfJZiiUTZyK989iLt6L3XjbIZ539x4BM4qpEiMYCQmAF2%2FFWLyXTSLqKmyar7ei3lzvU93c5psHkhiCqYxZHsiPY%2BrsmJt6NM%2BmopQRGVQyZLJnJLTdN7KsrnevSii1RWIBQUQ1cn4gV9Bpfbrki2YkFYr7UONKBxJUeEZ2DZaBvG9O683HYWtXV48TmJXU0R7EXGU15u60MnTjjOxG7KDAJKxPxLJMqQ1irL1vO96uNcLhDMIY%2BwUeSCyPcrmcN6vSwCJHJ%2BN4r5oZiPFrlHUXyA567ra2m2Z295hJMi0z4QM5rbb1ptV8Dznq8crYZZYhkgfyFzslUBXI%2Fjwd79aDrMOlszARose5nyj7Ia3bsq4HWncV85DqxE3NBBXA2HOVUrVa9fUzO1WAC%2Ftwbud2z9PRMSYSRY5sXX40NcMmrorxD%2BBLzcAzk3%2BbFIX8ikwUyHThkio4pkERwmwEx%2BLZfzytT7ZL17bfnATDiwU1%2BhE6ncIbviKrxdN4bc886sdcRu6hmMI8Sf4tk243c62Hal9HmlkAWeJ1ysyGmV6R3benAepmhnQOWFQ%2BuhzTUazlT8hmeeXgu2rcj7nfs2mONlmOqgT7T8h2qXx7q5EO9%2B2pF1m%2BBmQAA4%2Fc%2F4RcPiZP3dT0Oux69wwcSebln%2FwW9L%2BQlL6%2B%2FgFtWwb2kwQAAA%3D%3D'
        },
        {
            'name': 'f',
            'value': '5.0c4f4b6d233fb90636b4dd61b04726f147e1eada7172e06c47e1eada7172e06c47e1eada7172e06c47e1eada7172e06cb59320d6eb6303c1b59320d6eb6303c1b59320d6eb6303c147e1eada7172e06c8a38e2c5b3e08b898a38e2c5b3e08b890df103df0c26013a0df103df0c26013a2ebf3cb6fd35a0ac0df103df0c26013a8b1472fe2f9ba6b978e38434be2a23fac7b9c4258fe3658dbf11f980bc2bc377f2c082410b22639b04dbcad294c152cb0df103df0c26013a20f3d16ad0b1c5462da10fb74cac1eab2da10fb74cac1eab2ebf3cb6fd35a0acf0c77052689da50d03c77801b122405c2da10fb74cac1eab2da10fb74cac1eab71e7cb57bbcb8e0fba0ac8037e2b74f903c77801b122405cfa967f4e8cd565314e1848a6933553220823d89c0e0d484fbb30ebf890d750560e79b44b1f01e1bea925d90e8dfec722c4a7bdb682b087dd38f0f5e6e0d2832edc302a2ed09356c57c6c9b2f606103d746b8ae4e81acb9fa46b8ae4e81acb9fa02c68186b443a7ac15e402c38704f625ad217318ef88493d2da10fb74cac1eab2da10fb74cac1eab25037f810d2d41a8134ecdeb26beb8b53778cee096b7b985bf37df0d1894b088'
        },
        {
            'name': 'v',
            'value': '1628803296'
        },
        {
            'name': 'buyer_index_tooltip',
            'value': '1'
        },
        {
            'name': 'u',
            'value': '2ot1hf3x.cx8ex3.1n8h2u8j8c4w0'
        },
        {
            'name': 'sessid',
            'value': '5ac32fb2da935eff1c4601bfb8cea44f.1628805904'
        },
        {
            'name': 'buyer_laas_location',
            'value': '637640'
        },
        {
            'name': 'buyer_local_priority_v2',
            'value': '0'
        },
        {
            'name': 'so',
            'value': '1628807066'
        },
        {
            'name': 'ft',
            'value': '"G2KGysluTw8EquYLLxm5S+pglQIQCkpcaPKScMgSqmrYaKtUrPbVJq2tuTKe8oHHDGtQZ13hBw3WKySwTfCrLLHfR37BiJd+YMDvR3g1+G27eMFjx13BI3qn1lkS/gNN7cbMglAF3rnNZrJwOvwTOC24XBNgbiw3/uHq23lRfbnYD+m9vnlCwxqm57s6jtnf"'
        },
        {
            'name': 'buyer_selected_search_radius0',
            'value': '0'
        },
        {
            'name': 'luri',
            'value': 'moskva'
        },
        {
            'name': 'isLegalPerson',
            'value': '0'
        },
        {
            'name': 'buyer_location_id',
            'value': '637640'
        }
    ];

    await page.setCookie(...cookies)
    await page.mouse.move(randomInteger(100, 700), randomInteger(100, 400))
    await page.mouse.move(randomInteger(100, 1000), randomInteger(100, 1000))
    await wait(randomInteger(1, 15));
}

async function getLinks(page, pageNumber = 1) {
    await page.goto('https://www.avito.ru/moskva/gruzoviki_i_spetstehnika?radius=0?page=' + pageNumber);
    await wait();
    await page.screenshot({path: 'tmp/launch.jpg'})

    const $ = cheerio.load(await page.content());

    let links = [];
    await $('[data-marker=item]').each(async function () {
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