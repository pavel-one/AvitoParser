const {createWorker} = require("tesseract.js");

(async () => {
    const tesseract = await createWorker()
    await tesseract.load()
    await tesseract.loadLanguage('eng')
    await tesseract.initialize('eng')

    const HelperClass = require('./Classes/HelperClass')
    const ParserClass = require('./Classes/ParserClass')
    const helper = new HelperClass()
    const id = Number(process.argv[2])
    const config = await helper.getSetting(id)

    for (const page of config.pages) {
        let parser
        process.send(`Стартую парсинг id = ${id} page = ${page}`)

        //Пробуем сбилдить парсер
        try {
            parser = await ParserClass.build(page, config, tesseract)
        } catch (e) {
            console.log('!! BUILD ERROR !!', e)
            continue
        }

        //Пробуем инициализировать страницу
        try {
            await parser.init()
        } catch (e) {
            await parser.close()
            console.log('!! INIT ERROR !!', e)
            continue
        }

        //Запускаем парсер, если билд ОК
        try {
            await parser.process()
        } catch (e) {
            console.log("!! PARSER ERROR !!", e.message)
            await parser.close()
            continue
        }

        //Страница отработала
        await helper.removePage(config, page)
        await parser.close()
    }

    //Все страницы прошли, закрываем процесс, убиваем зависимости
    await tesseract.terminate()
    process.exit()
})()