(async () => {
    const HelperClass = require('./Classes/HelperClass')
    const ParserClass = require('./Classes/ParserClass')
    const helper = new HelperClass()
    const id = Number(process.argv[2])
    const config = await helper.getSetting(id)

    // await Promise.all(config.pages.map(async (page) => {
    //     let parser
    //     process.send(`Стартую парсинг id = ${id} page = ${page}`)
    //
    //     try {
    //         parser = await ParserClass.build(page, config)
    //     } catch (e) {
    //         console.log('!! BUILD ERROR !!', e)
    //         return page;
    //     }
    //
    //     try {
    //         await parser.process()
    //     } catch (e) {
    //         console.log("!! PARSER ERROR !!", e.message)
    //         await parser.close()
    //     }
    //
    //     await parser.close()
    // }))
    let page = config.pages[0]
    let parser
    process.send(`Стартую парсинг id = ${id} page = ${page}`)

    try {
        parser = await ParserClass.build(page, config)
    } catch (e) {
        console.log('!! BUILD ERROR !!', e)
        process.exit()
    }

    try {
        await parser.process()
    } catch (e) {
        console.log("!! PARSER ERROR !!", e.message)
        await parser.close()
    }

    await parser.close()

    process.exit()
})()