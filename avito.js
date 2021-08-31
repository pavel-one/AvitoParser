(async () => {
    const ParserClass = require('./Classes/ParserClass')
    const pages = 50;

    for (let page = 1; page < pages; page++) {
        try {
            const parser = await ParserClass.build(page)
            await parser.process()
        } catch (e) {
            console.log("PARSER ERROR:", e.message)
            await parser.close()
        }

        await parser.close();
    }



    return true;
})();

