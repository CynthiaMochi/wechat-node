'use strict'

var path = require('path')
var util = require('./lib/util')
var wechat_file = path.join(__dirname, './config/wechat.txt')

var config = {
    wechat: {
        appID: 'wxa122c6bab660e507',
        appSecret: 'f552e9293efaeaf287cf082e0cb9a618',
        token: 'myfinalprojectforschool',
		getAccessToken: function() {
			return util.readFileAsync(wechat_file)
		},
		saveAccessToken: function(data) {
			data = JSON.stringify(data)
			return util.writeFileAsync(wechat_file, data)
		}
    }
}

module.exports = config
