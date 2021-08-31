(async () => {
    const ParserClass = require('./Classes/ParserClass')
    const pages = 50;
    let pagesArray = []

    for (let i = 1; i < pages; i++) {
        pagesArray.push(i)
    }

    await Promise.all(pagesArray.map(async page => {
        console.log('!! NEW PAGE !!', page)

        const parser = await ParserClass.build(page)

        try {
            await parser.process()
        } catch (e) {
            console.log("PARSER ERROR:", e.message)
            await parser.close()
            return false;
        }

        await parser.close();
        return true;
    }))



    return true;
})();

