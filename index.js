const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://google.com');
    await page.screenshot({ path: 'google.png' });

    const avitoPage = await browser.newPage();
    await avitoPage.goto('https://www.avito.ru/');
    console.log('Ждем 5 секунд');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('Дождались');
    await avitoPage.goto('https://www.avito.ru/moskva/gruzoviki_i_spetstehnika?radius=0');

    await avitoPage.screenshot({ path: 'avito.png' });

    //TESSERACT library for phone
    await browser.close();
})();