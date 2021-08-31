'use strict';

const fs = require('fs');
const path = require('path');
const ABSPATH = path.dirname(process.mainModule.filename); // Absolute path to our app directory

module.exports = {
    listDir: (path) => {
        let files = fs.readdirSync( ABSPATH + path ); // You can also use the async method
        let filesWithStats = [];
        if( files.length > 1 ) {
            let sorted = files.sort((a, b) => {
                let s1 = fs.statSync(ABSPATH + path + '/' + a);
                let s2 = fs.statSync(ABSPATH + path + '/' + b);
                return s1.ctime < s2.ctime;
            });
            sorted.forEach(file => {
                filesWithStats.push({
                    filename: file,
                    date: new Date(fs.statSync(ABSPATH + path + '/' + file).ctime),
                    path: path + file
                });
            });
        } else {
            files.forEach(file => {
                filesWithStats.push({
                    filename: file,
                    date: new Date(fs.statSync(ABSPATH + path + file).ctime),
                    path: path + file
                });
            });
        }
        return filesWithStats;
    }
};