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
            'name': 'abp',
            'value': '0'
        }, {
            'name': 'st',
            'value': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjoidko0TkJ5SlU2TElJTGRDY3VNTkdBYnlzVGk3VTVKRW8wVkZQNXBSVll0ZVlpM0lxVUJ1Q2JQVUtjS0FnSGJvRW9yK3ZEVDlRd2Q1cUZ3dUtTa1RpVXNuLys5ZGVQenc0ZUNKanBSWWtFK1ozMmRTSlFEeDRUbmQvcE1Nc25Vckw0Q0liRERXM3pWL2s2UHA2UlpmWVM3SDFpdVViRkJjQkMzSjBLNzMwNmE0WDRpMDQ3VGRHNFd0a2piRm8yRWNkMTRzRkJLN1V5V0h0Q2lpR0lubmFmMDZzV2FsRVFNV3hiVVBWaUtKUmV5VHN6VUxUMnFZcVZVSlc1OU5RbVJiQy84KzAzbER1Vnlpa3poZEhoYTdHbkY3NE5ERVd1bndibGVjMDhQbm52UkE9IiwiaWF0IjoxNjI4NzI0MDE3LCJleHAiOjE2Mjk5MzM2MTd9.g4RiWGLx15eagntrSDgmh8FrC5V7BdnKE0JXZjYngzE'
        }, {
            'name': 'no-ssr',
            'value': '1'
        }, {
            'name': 'isWideScreen',
            'value': '1'
        }, {
            'name': 'cto_bundle',
            'value': 'dE4Dtl9NdllFSSUyQnczWTUxc2ZPM3NtN0lWeFhHeWVsQ1VMUEVMcjVVeng3dlM5RnlQN2hTc2lDMlNwUCUyQlAlMkJITjFkdHRVMFV3dGpLM2FrYUpZeHJ1T0lldkgzTlhtc09ncEY2VURPM0F2ZmhkZTBkSU90elVQaTFNZWFEWE1zbFZhbmVpag'
        }, {
            'name': 'sx',
            'value': 'H4sIAAAAAAACA1XMsQrDMAwE0H%2FRnEFpha3kb2qRiGCK3AqsQsi%2F10uHbgd3907glHvrpe3M4WrupGyuwbCe0GEFKzmW%2FinvFi7kFCjiGOKmrqIwwQbrnG7MM9IdrwlGjpIXOfbKymKoMl5V8UdS3fKTXu14IA1J2EY9pgN1I%2F8nU7quL2%2BxhKKnAAAA'
        }, {
            'name': 'f',
            'value': '5.0c4f4b6d233fb90636b4dd61b04726f147e1eada7172e06c47e1eada7172e06c47e1eada7172e06c47e1eada7172e06cb59320d6eb6303c1b59320d6eb6303c1b59320d6eb6303c147e1eada7172e06c8a38e2c5b3e08b898a38e2c5b3e08b890df103df0c26013a0df103df0c26013a2ebf3cb6fd35a0ac0df103df0c26013a8b1472fe2f9ba6b978e38434be2a23fac7b9c4258fe3658dbf11f980bc2bc377f2c082410b22639b04dbcad294c152cb0df103df0c26013a20f3d16ad0b1c5462da10fb74cac1eab2da10fb74cac1eab2ebf3cb6fd35a0acf0c77052689da50d03c77801b122405c2da10fb74cac1eab2da10fb74cac1eab71e7cb57bbcb8e0fba0ac8037e2b74f903c77801b122405cfa967f4e8cd565314e1848a6933553220823d89c0e0d484fbb30ebf890d750560e79b44b1f01e1bea925d90e8dfec722c4a7bdb682b087dd38f0f5e6e0d2832edc302a2ed09356c57c6c9b2f606103d746b8ae4e81acb9fa46b8ae4e81acb9fa02c68186b443a7ac15e402c38704f6255881802286afa4012da10fb74cac1eab2da10fb74cac1eab25037f810d2d41a8134ecdeb26beb8b53778cee096b7b985bf37df0d1894b088'
        }, {
            'name': 'uxs_uid',
            'value': 'cc8aab60-fafa-11eb-8e22-b74e16365b4e'
        }, {
            'name': 'dfp_group',
            'value': '62'
        }, {
            'name': 'ft',
            'value': '"D3/WPWVSaUdaKdwvwFtkwwnLdQZhB/N3IjBljktZuIW3CRm+YaQR1FfhBazvO8I0H9ZcQu6JRdzWz/XUh3NSC/BU728KaIW2s6BwVmdhKcRibNhC9zgkubankb7m9l6eoRvdMP1VRNu4KETAof+Ktd9xA1JxLJxaA7jqSx3BkztQgUZlu4k3mYrab/v3T8vu"'
        }, {
            'name': 'u',
            'value': '2oufkbnz.1kh7th.tqjqjqs1osg'
        }, {
            'name': '_buzz_fpc',
            'value': 'JTdCJTIycGF0aCUyMiUzQSUyMiUyRiUyMiUyQyUyMmRvbWFpbiUyMiUzQSUyMi53d3cuYXZpdG8ucnUlMjIlMkMlMjJleHBpcmVzJTIyJTNBJTIyVGh1JTJDJTIwMTElMjBBdWclMjAyMDIyJTIwMjMlM0EyMCUzQTI2JTIwR01UJTIyJTJDJTIyU2FtZVNpdGUlMjIlM0ElMjJMYXglMjIlMkMlMjJ2YWx1ZSUyMiUzQSUyMiU3QiU1QyUyMnZhbHVlJTVDJTIyJTNBJTVDJTIyZTZkNjYxZjA4Yzg5NTgxZjNjNjk3MzM5YTBlYWU2MmM3NDkwNDAxMTllZDM5MTIwYTU5MmU5ODk4NDEyYzE4NyU1QyUyMiUyQyU1QyUyMmlzTmV3Q29va2llJTVDJTIyJTNBdHJ1ZSU3RCUyMiU3RA=='
        }, {
            'name': 'sessid',
            'value': 'e90862e19e1abce27308214c93807979.1628724030'
        }, {
            'name': '__gads',
            'value': 'ID=1f6e8a9edbe3d094-2279b38e9dc800c4:T=1628724018:S=ALNI_MZHSmxiHtKji8g1hLPnmLbFDFL8jw'
        }
    ];

    await page.setCookie(...cookies)
    await wait();
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