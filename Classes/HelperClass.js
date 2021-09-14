const path = require("path")
const fs = require("fs")
const ps = require('ps-node')

class HelperClass {
    rootDir = path.join(__dirname, '../')
    cookiesPath = path.join(this.rootDir, 'cookies')
    proxyPath = path.join(this.rootDir, 'proxy.json')
    settingsPath = path.join(this.rootDir, 'settings.json')
    resultPath = path.join(this.rootDir, 'results')
    imagesPath = path.join(this.rootDir, 'images')

    getProxy = async () => {
        return JSON.parse(await fs.readFileSync(this.proxyPath))
    }

    //Получение всех сеттингов
    getSettings = async () => {
        return JSON.parse(await fs.readFileSync(this.settingsPath))
    }

    //Установка всех сеттингов
    setSettings = async (settings) => {
        return fs.writeFileSync(this.settingsPath, JSON.stringify(settings))
    }

    //Получение натсроек одного прокси
    getSetting = async (id) => {
        const allSettings = await this.getSettings()
        let resultObj

        await Promise.all(allSettings.proxy.map(async (item) => {
            if (item.id === Number(id)) {
                resultObj = item
            }
        }))

        return resultObj;
    }

    //Установка нстроек одного прокси
    setSetting = async (setting) => {
        const allSettings = await this.getSettings()

        await Promise.all(allSettings.proxy.map(async (item) => {
            if (item.id === setting.id) {
                item.id = setting.id
                item.host = setting.host
                item.username = setting.username
                item.password = setting.password
                item.pages = setting.pages
                item.pid = setting.pid
                return item
            }
        }))

        await this.setSettings(allSettings)
    }

    //Удаляет одну страницу из настроек
    removePage = async (config, page) => {
        config.pages = config.pages.filter((item, index) => {
            if (item === page) {
                console.log('removed', item)
                return null;
            }

            return item;
        })

        await this.setSetting(config)
    }

    //Завершает дочерний процесс
    closeProcess = async (config) => {
        const pid = config.pid

        config.pid = null;
        await this.setSetting(config)

        ps.kill( pid, function(err) {
            if (err) {
                throw new Error( err );
            }
            else {
                console.log( 'Process %s has been killed!', pid );
            }
        });
    }

    //Очищает результаты
    clearResult = async () => {
        const dir = fs.readdirSync(this.resultPath)
        for (const file of dir) {
            if (file === '.gitignore') {
                continue;
            }
            console.log('REMOVE FILE' , file)
            await fs.unlinkSync(path.join(this.resultPath, file))
        }

        const dir2 = fs.readdirSync(this.imagesPath)
        for (const file of dir2) {
            if (file === '.gitignore') {
                continue;
            }
            console.log('REMOVE IMAGE' , file)
            await fs.unlinkSync(path.join(this.imagesPath, file))
        }
    }
}

module.exports = HelperClass