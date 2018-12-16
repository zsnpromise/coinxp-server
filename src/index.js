const Koa = require('koa');
const router = require('koa-router')();
const app = new Koa();
const redis = require("redis");
const bluebird = require("bluebird");
bluebird.promisifyAll(redis.RedisClient.prototype);
const client = redis.createClient();
const api_cxp = require('./cxpAPI');
const apiConfig = require("../config/apiConfig.js");
const loggerfun = require("./loglib")
const logger = loggerfun.logger('cheese')
// --------------------------------------- 启动服务
const { userServer } = require('./userServer')
userServer()
// ------------ 设置请求头 --------------------
app.use(async (ctx, next)  => {
  const origin = ctx.request.get('Origin');
  ctx.set('Access-Control-Allow-Origin', origin);
  ctx.set('Access-Control-Allow-Headers','X-Requested-With');
  ctx.set('Access-Control-Allow-Headers','X-Requested-With');
  ctx.set('Content-Type','application/json;charset=utf-8');
  await next();
})
// ---------------- 请求接口 --------------------
// 用户登记，返回用户资产
router.get('/addUser', async (ctx, next) => {
  // reply is null when the key is missing
  let asset = await addUser(ctx.query.name, ctx.query.userNameChain)
  ctx.response.body = {
    code: 0,
    data: asset,
    success: true,
    errno: 'OK'
  }
  ctx.status = 200
  next();
});
// 用户登记
let addUser = async (name, userNameChain) => {
  let value = await client.hgetAsync('userList', userNameChain)
  // 如果用户已经注册了，则把用户查询返回，没有注册则注册
  if (!value) {
    let asset = await api_cxp.queryBlanceExchange(userNameChain, apiConfig.dataBase, apiConfig.baseHost) // 总排行就是当前资产排行
    if (asset) {
      client.hset("userList", userNameChain, name, redis.print);
    }
  }
  return {}
}
// 获取查询用户交易记录
router.get('/getOrderList', async (ctx, next) => {
  // reply is null when the key is missing
  let orderList = await api_cxp.getUserOrders(ctx.query.userNameChain, () => {})
  let list = []
  if (orderList && orderList.rows) {
    let len = orderList.rows.length
    let i = 0
    for (;len--;) {
      i++
      if (i > 9) {
        break
      }
      list.push(orderList.rows[len])
    }
  }
  ctx.response.body = {
    code: 0,
    data: list,
    success: true,
    errno: 'OK'
  }
  ctx.status = 200
  next();
});
// 获取用户总资产集合
router.get('/getRankList', async (ctx, next) => {
  // reply is null when the key is missing
  let asset_list = await client.hkeysAsync('asset_list_table')
  asset_list.sort((a, b) => b.replace(/_/g, '') - a.replace(/_/g, ''))
  asset_list = await client.hgetAsync('asset_list_table', asset_list[0])

  ctx.response.body = {
    code: 0,
    data: asset_list,
    success: true,
    errno: 'OK'
  }
  ctx.status = 200
  next();
});
// 获取所有支持的交易对
router.get('/getProductList', async (ctx, next) => {
  // reply is null when the key is missing
  let productList = await client.getAsync('productList')
  ctx.response.body = {
    code: 0,
    data: productList,
    success: true,
    errno: 'OK'
  }
  ctx.status = 200
  next();
});
// 获取单个用户资产变更记录
router.get('/getUserRecord', async (ctx, next) => {
  // reply is null when the key is missing
  let userNameChain = ctx.query.userNameChain
  let asset_list = await client.hkeysAsync('userInfo_' + userNameChain)
  let list = [], len = asset_list.length
  for (; len--;) {
    list.push({
      time: asset_list[len],
      asset: await client.hgetAsync('userInfo_' + userNameChain, asset_list[len])
    })
  }
  list.sort((a, b) => a.time.replace(/_/g, '') - b.time.replace(/_/g, ''))
  ctx.response.body = {
    code: 0,
    data: list,
    success: true,
    errno: 'OK'
  }
  ctx.status = 200
  next();
});
app.use(router.routes());
app.on('error', err => {
  logger.info(JSON.stringify(err));
  console.log('server error', err)
});
app.listen(apiConfig.host);
