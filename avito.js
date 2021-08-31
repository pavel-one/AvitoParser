const fs = require("fs");

(async () => {
    let newParse = false
    const args = process.argv.slice(2)
    if (args.length && args[0] === 'new') {
        newParse = true
    }

    const ParserClass = require('./Classes/ParserClass')

    //Сохранение процесса парсинга
    const pagesObjectPath = 'pagesObject.json'
    let pagesObject = {
        last: await getLastPage(),
        current: 1
    }

    if (fs.existsSync(pagesObjectPath) && !newParse) {
        const raw = JSON.parse(await fs.readFileSync(pagesObjectPath))
        pagesObject.current = raw.current
    } else {
        await fs.writeFileSync(pagesObjectPath, JSON.stringify(pagesObject));
    }


    console.log('Начинаю со страницы: ', pagesObject.current)
    let parser;
    for (pagesObject.current; pagesObject.current < pagesObject.last; pagesObject.current++) {
        try {
            parser = await ParserClass.build(pagesObject.current)
        } catch (e) {
            console.log("BUILD ERROR:", e.message)
            continue;
        }

        try {
            await parser.process()
            await fs.writeFileSync(pagesObjectPath, JSON.stringify(pagesObject));
        } catch (e) {
            console.log("PARSER ERROR:", e.message)
            await parser.close()
        }

        await parser.close();
    }



    return true;
})();

async function getLastPage() {
    const ParserClass = require('./Classes/ParserClass')
    const parser = await ParserClass.build(1)
    const last = await parser.getLastPage()
    await parser.close()
    return last
}

