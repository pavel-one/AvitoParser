(async () => {
    const ParserClass = require('./Classes/ParserClass')
    const pages = 50;
    let parser;

    for (let page = 1; page < pages; page++) {
        try {
            parser = await ParserClass.build(page)
        } catch (e) {
            console.log("BUILD ERROR:", e.message)
            continue;
        }

        try {
            await parser.process()
        } catch (e) {
            console.log("PARSER ERROR:", e.message)
            await parser.close()
        }

        await parser.close();
    }



    return true;
})();

