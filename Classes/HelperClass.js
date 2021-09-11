const path = require("path");
const fs = require("fs");

class HelperClass
{
    rootDir = path.join(__dirname, '../')
    cookiesPath = path.join(this.rootDir, 'cookies')
    proxyPath = path.join(this.rootDir, 'proxy.json')
    settingsPath = path.join(this.rootDir, 'settings.json')

    getProxy = async () => {
        return JSON.parse(await fs.readFileSync(this.proxyPath))
    }

    getSettings = async () => {
        return JSON.parse(await fs.readFileSync(this.settingsPath))
    }

    getSetting = async (id) => {
        const allSettings = this.getSettings()
        let resultObj

        await Promise.all(allSettings.proxy.map(async (item) => {
            if (item.id === id) {
                resultObj = item
            }
        }))

        return resultObj;
    }
}

module.exports = HelperClass