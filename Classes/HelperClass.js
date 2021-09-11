const path = require("path");
const fs = require("fs");

class HelperClass {
    rootDir = path.join(__dirname, '../')
    cookiesPath = path.join(this.rootDir, 'cookies')
    proxyPath = path.join(this.rootDir, 'proxy.json')
    settingsPath = path.join(this.rootDir, 'settings.json')

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
}

module.exports = HelperClass