const api_cxp = require('./cxpAPI');
const redis = require("redis");
const bluebird = require("bluebird");
const apiConfig = require("../config/apiConfig.js");
const loggerfun = require("./loglib")
const logger = loggerfun.logger('cheese')
bluebird.promisifyAll(redis.RedisClient.prototype);
const client = redis.createClient();
// 定时执行服务
const time = apiConfig.time
let init_money = apiConfig.initAsset // 活动开始拥有的BTC
let ret, len, info
let userServer = async () => {
  try {
    let asset_list = [] // 当前用户资产集合
    let curry_time = new Date();
    let newsTime = '' + Date.now() // 日期
    let newsTime_key = curry_time.getFullYear() + '_' + curry_time.getMonth() + '_' + curry_time.getDate()
    curry_time.setDate(curry_time.getDate() - 1)
    let oldTime_key = curry_time.getFullYear() + '_' + curry_time.getMonth() + '_' + curry_time.getDate()
    // 获取所有用户
    let userList = await client.hkeysAsync('userList')
    // 获取所有的ticker
    let tickerList = [], productList = []
    productList = await api_cxp.getTradepair(() => {}, )
    if (productList) {
      productList = productList.rows
    }
    productList || (productList = [])
    client.set("productList", JSON.stringify(productList))
    len = productList.length
    for (; len--;) {
      info = productList[len]
      if (info.currency !== 'BTC') {
        continue
      }
      ret = await api_cxp.queryLastPrice(`${info.commodity}/${info.currency}`.toLowerCase(), apiConfig.baseHost)
      if (ret) {
        ret.type = info.commodity
        tickerList.push(ret)
      }
    }
    let tickerList_len = tickerList.length
    // 保存用户当天的资产
    let userList_len = userList.length
    let userNameChain
    for (; userList_len--;) {
      userNameChain = userList[userList_len]
      let asset = await api_cxp.queryBlanceExchange(userNameChain, apiConfig.dataBase, apiConfig.baseHost) // 总排行就是当前资产排行
      asset = asset.coins
      len = asset.length
      // 把用户的资产按照当前最新价格换成BTC,并且计算各个币种所占的百分比
      let total_asset = 0, btc_asset = 0, eth_asset = 0, eos_asset = 0, other_asset = 0
      for (; len--;) {
        if (asset[len].type === 'BTC') {
          btc_asset = asset[len].balance
        } else {
          if (tickerList_len) {
            for (let i = tickerList_len; i--;) {
              if (tickerList[i].type == asset[len].type) {
                p = asset[len].balance * tickerList[i].price
                if (asset[len].type === 'ETH') {
                  eth_asset = p
                } else if (asset[len].type === 'EOS') {
                  eos_asset = p
                } else {
                  other_asset += p
                }
                break;
              }
            }
          }
        }
      }
      total_asset = btc_asset + eth_asset + eos_asset + other_asset
      // 获取当前用户名称
      let name = await client.hgetAsync('userList', userNameChain)
      // 把当前用户前一天和前七天的资产取出
      let user_asset = await client.hkeysAsync('userInfo_' + userNameChain)
      len = user_asset.length
      let day_asset = init_money, week_asset = init_money
      if (len) {
        user_asset.sort((a, b) => b.replace(/_/g, '') - a.replace(/_/g, ''))
        let day = await client.hgetAsync('userInfo_'+ userNameChain, user_asset[0])
        let week = await client.hgetAsync('userInfo_'+ userNameChain, user_asset[len > 6 ? 6 : (len - 1)])
        if (day) {
          day_asset = JSON.parse(day).total_asset
        }
        if (week) {
          week_asset = JSON.parse(week).total_asset
        }
      }
      // 保存用户集合
      asset_list.push({
        name,
        userNameChain,
        total_asset: (total_asset).toFixed(2),  // 总资产
        day_asset: (total_asset - day_asset).toFixed(2), // 与前一天对比资产变化
        week_asset: (total_asset - week_asset).toFixed(2)  // 与前一周对比资产变化
      })
       // 把用户当前的资产保存
      info = {
        total_asset: (total_asset).toFixed(2),
        btc_asset: (btc_asset).toFixed(2),
        eth_asset: (eth_asset).toFixed(2),
        eos_asset: (eos_asset).toFixed(2),
        other_asset: (other_asset).toFixed(2),
        newsTime
      }
      let userInfo_asset = JSON.stringify(info)
      client.hset('userInfo_' + userNameChain, newsTime_key, userInfo_asset, redis.print);
    }
    // 保存用户资产集合
    let oldRnkList = {day: [], week: [], total: []}
    let all_key = await client.hkeysAsync('asset_list_table')
    if (~all_key.indexOf(oldTime_key)) {
      oldRnkList = JSON.parse(await client.hgetAsync('asset_list_table', oldTime_key))
    }
    let day = RankSort('day', asset_list, oldRnkList.day)
    let week = RankSort('week', asset_list, oldRnkList.week)
    let total = RankSort('total', asset_list, oldRnkList.total)
    client.hset('asset_list_table', newsTime_key, JSON.stringify({day, week, total}), redis.print);
  } catch(e) {
    logger.info(JSON.stringify(e));  
    setTimeout(() => {
      userServer()
    }, 1000 * 60 * 60)
  }
  setTimeout(() => {
    userServer()
  }, time)
}
function RankSort(key, rankList, oldRnkList) {
  let list = rankList.sort((a, b) => {
    return a[key] - b[key] > 0
  })
  let len, len_two, i, j, bl
  len = list.length
  len_two = oldRnkList.length
  for (i = 0; i < len; i++) {
    list[i].rankId = i + 1
     bl = true
     for (j = len_two; j--;) {
       if (list[i].userNameChain === oldRnkList[j].userNameChain) {
        list[i].oldRankId = oldRnkList[j].rankId
        bl = false
        break;
       }
     }
     if (bl) {
      list[i].oldRankId = -1
     }
  }
  return list
}
module.exports.userServer = userServer