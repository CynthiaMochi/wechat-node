'use strict'

var sha1 = require('sha1')
var getRawBody = require('raw-body')
var Wechat = require('./wechat')
var util = require('./util')

// 处理事件，推送的信息等
module.exports = function(opts, handler) {
	// 管理和用户的接口,票据的更新等
	var wechat = new Wechat(opts)
	
	return function *(next) {
		var that = this,
			token = opts.token,
			signature = this.query.signature,
			nonce = this.query.nonce,
			timestamp = this.query.timestamp,
			echostr = this.query.echostr,
			str = [token, timestamp, nonce].sort().join(''),
			sha = sha1(str);

		if (this.method === 'GET') {
			// 刚开始验证时
			if (sha === signature) {
				this.body = echostr + ''
			} else {
				this.body = 'wrong'
			}
		} else if(this.method === 'POST'){
			// 发送的是用户的数据
			if (sha !== signature) {
				this.body = 'wrong'
			 	return false
			}
			var data = yield getRawBody(this.req, {
			 	length: this.length,
				limit: '1mb',
				encoding: this.charset
			})

			var content = yield util.parseXMLAsync(data)
			var message = util.formatMessage(content.xml)
			
			this.weixin = message
			yield handler.call(this, next)
			wechat.reply.call(this)
		}
	} 
}


