(async () => {
    const ParserClass = require('./Classes/ParserClass')
    const parser = await ParserClass.build()

    try {
        await parser.process()
    } catch (e) {
        console.log("PARSER ERROR:", e.message)
        await parser.close()
    }

    await parser.close();

    return true;
})();

