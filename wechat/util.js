'use strict'

var xml2js = require('xml2js')
var Promise = require('bluebird')
var tpl = require('./tpl')

exports.parseXMLAsync = function(xml) {
	return new Promise(function(resolve, reject) {
		xml2js.parseString(xml, {trim: true}, function(err, content) {
			if (err) reject(err)
			else resolve(content)
		})	
	})
}

function formatMessage(result) {
	var message = {}

	if (typeof result === 'object') {
		var keys = Object.keys(result)

		for (var i = 0; i < keys.length; i++) {
			var item = result[keys[i]],
				key = keys[i];

			if (!(item instanceof Array) || item.length === 0) {
				// 如果不是数组，或者为空，就跳过
				continue
			}
			if (item.length === 1) {
				// 如果是数组，且只有一个值
				var val = item[0]

				if (typeof val === 'obj') {
					// 如果是对象，就递归
					message[key] = formatMessage(val)
				} else {
					message[key] = (val || '').trim()
				}
			} else {
				// 有多个值的数组
				message[key] = []

				for (var j = 0, k = item.length; j < k; j++) {
					message[key].push(formatMessage[item[j]])
				}
			}
		}
	}
	return message
}

exports.formatMessage = formatMessage

exports.tpl = function(content, message) {
	var info = {},
		type = 'text',
		fromUserName = message.FromUserName,
		toUserName = message.ToUserName;

	if (Array.isArray(content)) {
		type = 'news'
	}
	type = content.type || type
	info.content = content
	info.createTime = new Date().getTime()
	info.msgType = type
	info.toUserName = fromUserName
	info.fromUserName = toUserName
	
	return tpl.compiled(info)
}

