const express = require('express')
const app = express()
const fs = require('fs')
const {request, response} = require("express");
const port = 3000
const child = require('child_process')
const path = require("path");

app.set('view engine', 'pug');

let parser = '';

app.get('/', (request, response) => {
    response.setHeader('Content-Type', 'application/json')
    if (!fs.existsSync('output.json')) {
        response.send({
            'message': 'Результатов еще не сгенерирорвано, зайдите позже'
        })
    }
    const json = fs.readFileSync('output.json')

    response.send(JSON.parse(json))
})

app.use('/static', express.static(path.join(__dirname, 'tmp')))
app.get('/process', (req, res) => {
    let images = getImagesFromDir(path.join(__dirname, 'tmp'));
    res.render('index', {title: 'Процесс парсинга', images: images})
});

function getImagesFromDir(dirPath) {
    let allImages = [];

    let files = fs.readdirSync(dirPath);

    let file;
    for (file of files) {
        let fileLocation = path.join(dirPath, file);
        const stat = fs.statSync(fileLocation);
        if (stat && stat.isDirectory()) {
            getImagesFromDir(fileLocation);
        } else if (stat && stat.isFile() && ['.jpg', '.png'].indexOf(path.extname(fileLocation)) !== -1) {
            allImages.push({
                url: 'static/' + file,
                name: file
            });
        }
    }

    return allImages;
}

app.get('/run', (request, response) => {
    if (typeof parser === 'object') {
        response.send({
            message: `Парсер запущен, id процесса ${parser.pid} ожидайте завершения, или завершите вручную`
        })
        return;
    }

    parser = child.fork('parser.js');

    process.on('message', function (m) {
        console.log('PARSER MESSAGE:', m)
    })

    response.send({
        message: 'Процесс запущен'
    })
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
    response.send({
        message: 'Парсер успешно остановлен'
    })
})

app.listen(port, (err) => {
    if (err) {
        return console.log('Ошибка запуска сервера', err)
    }
    console.log(`Сервер запущен на ${port}`)
})