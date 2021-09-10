const express = require('express')
const app = express()
const fs = require('fs')
const {request, response} = require("express")
const port = 3000
const child = require('child_process')
const path = require("path")
const bodyParser = require('body-parser')

const proxyFilePath = __dirname + '/proxy.json'

app.use( bodyParser.json() )
app.use(bodyParser.urlencoded({
    extended: true
}));

app.set('view engine', 'pug');
let parser = '';

app.use('/static', express.static(path.join(__dirname, 'tmp')))
app.use('/result', express.static(path.join(__dirname, 'results')))
app.use('/images', express.static(path.join(__dirname, 'images')))

app.get('/', async (request, response) => {

    const title = 'Управление парсером'
    let parserProcess = typeof parser === 'object';

    const proxy =  JSON.parse(await fs.readFileSync(proxyFilePath))

    const pagesObjectPath = 'pagesObject.json'
    let processParse = {
        current: 1,
        last: 1
    }

    if (fs.existsSync(pagesObjectPath)) {
        processParse = JSON.parse(await fs.readFileSync(pagesObjectPath))
    }

    response.render('index', {
        parserProcess,
        title,
        proxy,
        processParse
    })
})

app.get('/clear', async (request, response) => {
    await fs.unlinkSync('pagesObject.json')

    response.redirect('back')
})

app.post('/proxy', (request, response) => {
    fs.writeFileSync(proxyFilePath, JSON.stringify(request.body))

    response.redirect('back')
})

app.get('/files', (request, response) => {
    response.setHeader('Content-Type', 'application/json')

    const dir = path.join(__dirname, 'results')
    let files = fs.readdirSync(dir);
    let allFiles = []
    let fullUrl = request.protocol + '://' + request.get('host');

    let file;
    for (file of files) {
        if (file === '.gitignore') {
            continue;
        }

        let time = fs.statSync(`${dir}/${file}`).mtime.getTime();

        allFiles.push({
            url: fullUrl + '/result/' + file,
            name: file,
            time: time
        });
    }

    response.send(allFiles)
})
app.get('/process', (req, res) => {
    let images = getImagesFromDir(path.join(__dirname, 'tmp'));
    const pagesObjectPath = 'pagesObject.json'
    let processParse = {
        current: 1,
        last: 1
    }

    if (fs.existsSync(pagesObjectPath)) {
        processParse = JSON.parse(fs.readFileSync(pagesObjectPath))
    }

    res.render('process', {
        title: 'Процесс парсинга',
        images: images,
        process: processParse
    })
});
app.get('/run', (request, response) => {
    if (typeof parser === 'object') {
        response.send({
            message: `Парсер запущен, id процесса ${parser.pid} ожидайте завершения, или завершите вручную`
        })
        return;
    }

    if (request.query.reload === '1') {
        parser = child.fork(__dirname + '/avito.js', ['new']);
    } else {
        parser = child.fork(__dirname + '/avito.js');
    }


    process.on('message', function (m) {
        console.log('PARSER MESSAGE:', m)
    })

    response.redirect('back')
})
app.get('/stop', (request, response) => {
    if (typeof parser !== 'object') {
        response.send({
            message: `Парсер не запущен`
        })
        return '';
    }

    parser.kill();
    parser = '';
    response.redirect('back')
})

app.listen(port, (err) => {
    if (err) {
        return console.log('Ошибка запуска сервера', err)
    }
    console.log(`Сервер запущен на ${port}`)
})

function getImagesFromDir(dirPath) {

    let allImages = [];

    let files = fs.readdirSync(dirPath);

    let file;
    for (file of files) {
        if (file === '.gitignore') {
            continue;
        }

        let fileLocation = path.join(dirPath, file);
        const stat = fs.statSync(fileLocation);
        allImages.push({
            url: 'static/'+file,
            name: file
        });
    }

    return allImages;
}
