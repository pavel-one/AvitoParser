const path = require("path");
const fs = require("fs");

class HelperClass {
    rootDir = path.join(__dirname, '../')
    cookiesPath = path.join(this.rootDir, 'cookies')
    proxyPath = path.join(this.rootDir, 'proxy.json')
    settingsPath = path.join(this.rootDir, 'settings.json')
    resultPath = path.join(this.rootDir, 'results')

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

    clearResult = async () => {
        const dir = fs.readdirSync(this.resultPath)
        for (const file of dir) {
            if (file === '.gitignore') {
                continue;
            }
            console.log('REMOVE FILE' , file)
            fs.unlinkSync(path.join(this.resultPath, file))
        }
    }
}

module.exports = HelperClass