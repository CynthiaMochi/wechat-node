'use strict'

var Promise = require('bluebird')
var request = Promise.promisify(require('request'))
var _ = require('lodash')
var util = require('./util')
var fs = require('fs')
var prefix = 'https://api.weixin.qq.com/cgi-bin/'
var api = {
	accessToken: prefix + 'token?grant_type=client_credential',
	temporary: {
		upload: prefix + 'media/upload?',
		fetch: prefix + 'media/get?'
	},
	permanent: {
		upload: prefix + 'material/add_material?',
		uploadNews: prefix + 'material/add_news?',
		uploadNewsPic: prefix + 'material/uploading?',
		fetch: prefix + 'material/get_material',
		del: prefix + 'material/del_material',
		update: prefix + 'material/update_news',
		count: prefix + 'material/get_materialcount',
		batch: prefix + 'material/batchget_material'
	}
}

function Wechat(opts) {
	var that = this;
	this.appID = opts.appID;
	this.appSecret = opts.appSecret;
	this.getAccessToken = opts.getAccessToken;
	this.saveAccessToken = opts.saveAccessToken;

	this.fetchAccessToken()

}

Wechat.prototype.fetchAccessToken = function(data) {
	var that = this

	if (this.access_token && this.expires_in) {
		if (this.isValidAccessToken(this)) {
			return Promise.resolve(this)
		}
	}

	this.getAccessToken()
		.then(function(data) {
			try {
				data = JSON.parse(data)
			}
			catch(e) {
				// 若失败或不合法
  				return that.updateAccessToken(data)
			}
			if (that.isValidAccessToken(data)) {
				return Promise.resolve(data)
			}
			else {
				return that.updateAccessToken()
			}
		})
		.then(function(data){
			// 合法的
			that.access_token = data.access_token;
			that.expires_in = data.expires_in; // 过期字段

			that.saveAccessToken(data)
			return Promise.resolve(data)
		})
}
Wechat.prototype.isValidAccessToken = function(data) {
	if (!data || !data.access_token || !data.expires_in) {
		return false
	}

	var access_token = data.access_token,
		expires_in = data.expires_in,
		now = (new Date().getTime());

	if (now < expires_in) {
		return true
	} else {
		return false
	}
}

Wechat.prototype.updateAccessToken = function() {
	var appID = this.appID,
		appSecret = this.appSecret,
		url = api.accessToken + '&appid=' + appID + '&secret=' + appSecret;
	
	return new Promise(function(resolve, reject) {
		request({url: url, json: true}).then(function(response) {
			console.log(response.body)
			var data = response.body,
				now = (new Date().getTime()),
				expires_in = now + (data.expires_in - 20) * 1000; // 提前刷新

			data.expires_in = expires_in
		
			resolve(data)
		})
	})

}

Wechat.prototype.uploadMaterial = function(type, material, permanent) {
	// material如果是图文的话，传的是一个数组
	// 如果是图片或视频传的是文件路径
	var that = this,
		form = {},
		uploadUrl = api.temporary.upload;

	if (permanent) {
		uploadUrl = api.permanent.upload

		_.extend(form, permanent)
	}

	if (type === 'pic') {
		uploadUrl = api.temporary.uploadNewsPic;
	}
	if (type === 'news') {
		uploadUrl = api.temporary.uploadNewsPic;
		form = material
	}
	else {
		form.media = fs.createReadStream(material)
	}


	return new Promise(function(resolve, reject) {
		that
			.fetchAccessToken()
			.then(function(data) {
				var url = uploadUrl + 'access_token=' + data.access_token;

				if (!permanent) {
					url += '&type=' + type
				} else {
					form.access_token = data.access_token
				}

				var options = {
 					method: 'POST',
					url: url,
					json: true
				}

				if (type === 'news') {
					options.body = form
				} else {
					options.formData = form
				}

				request(options).then(function(response) {
					var _data = response.body
					console.log(Object.keys(_data))

					if (_data) {
						resolve(_data)
					} else {
						throw new Error('Upload material fails')
  					}
		
				})
				.catch(function(err) {
					reject(err)	
  				})
				
			})
	})

}
Wechat.prototype.fetchMaterial = function(mediaId, type, permanent) {
	
	var that = this,
		fetchUrl = api.temporary.fetch;

	if (permanent) {
		fetchUrl = api.permanent.uploadNewsPic
	}

	return new Promise(function(resolve, reject) {
		that
			.fetchAccessToken()
			.then(function(data) {
				var url = fetchUrl + 'access_token=' + data.access_token + '&media_id=' + mediaId;

				if (!permanent && type === 'video') {
					url = url.replace('https://', 'http://')
				}

				resolve(url)
				
			})
	})

}

Wechat.prototype.deleteMaterial = function(mediaId) {
	
	var that = this,
		form = {
			media_id: mediaId
		};

	return new Promise(function(resolve, reject) {
		that
			.fetchAccessToken()
			.then(function(data) {
				var url = api.permanent.del + 'access_token=' + data.access_token + '&media_id=' + mediaId;
				var options = {
 					method: 'POST',
					url: url,
					json: true,
					body: form
				}
				request(options).then(function(response) {
					var _data = response.body
					console.log(response[1])

					if (_data) {
						resolve(_data)
					} else {
						throw new Error('Upload material fails')
  					}
		
				})
				.catch(function(err) {
					reject(err)	
  				})

				
			})
	})

Wechat.prototype.updateMaterial = function(mediaId, news) {
	
	var that = this,
		form = {
			media_id: mediaId
		};

	_.extend(form, news)


	return new Promise(function(resolve, reject) {
		that
			.fetchAccessToken()
			.then(function(data) {
				var url = api.permanent.update + 'access_token=' + data.access_token + '&media_id=' + mediaId;
				var options = {
 					method: 'POST',
					url: url,
					json: true,
					body: form
				}
				request(options).then(function(response) {
					var _data = response.body
					console.log(response[1])

					if (_data) {
						resolve(_data)
					} else {
						throw new Error('Upload material fails')
  					}
		
				})
				.catch(function(err) {
					reject(err)	
  				})

				
			})
	})
}

Wechat.prototype.countMaterial = function() {
	
	var that = this

	return new Promise(function(resolve, reject) {
		that
			.fetchAccessToken()
			.then(function(data) {
				var url = api.peirmanent.count + 'access_token=' + data.access_token;
				var options = {
 					method: 'GET',
					url: url,
					json: true
				}
				request(options).then(function(response) {
					var _data = response.body
					console.log(response[1])

					if (_data) {
						resolve(_data)
					} else {
						throw new Error('Upload material fails')
  					}
		
				})
				.catch(function(err) {
					reject(err)	
  				})

				
			})
	})
}

Wechat.prototype.batchMaterial = function(option) {
	
	var that = this
	
	option.type = option.type ||'image'
	option.offset = option.offset || 0
	option.count = option.count || 1

	return new Promise(function(resolve, reject) {
		that
			.fetchAccessToken()
			.then(function(data) {
				var url = api.peirmanent.count + 'access_token=' + data.access_token;
				var options = {
 					method: 'POST',
					url: url,
					json: true,
					body: option
				}
				request(options).then(function(response) {
					var _data = response.body
					console.log(response[1])

					if (_data) {
						resolve(_data)
					} else {
						throw new Error('Upload material fails')
  					}
		
				})
				.catch(function(err) {
					reject(err)	
  				})

				
			})
	})
}
Wechat.prototype.reply = function() { 
	var content = this.body,
		message = this.weixin,
		xml = util.tpl(content, message);
	this.status = 200
	this.type = 'application/xml'
	this.body = xml
}

module.exports = Wechat
