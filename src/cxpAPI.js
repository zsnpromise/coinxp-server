///////////////////////////////////////////////////////////////
/**  
*   
*  @fileOverview CXP  API
*  create date: 2018.7.1
*  @author  zhangyong  @ coinxp
*  @email: zhangyong@coinxp.io
*  @version 0.9
*/
///////////////////////////////////////////////////////////////


const fs = require('fs');
const Eos = require('eosjs');
const EosAPI = require('eosjs-keygen');


const eosAPI_VERSION = 'V0.9'
const requestTimeOut = 3000

console.info(' ------------------------- ')
console.info('cxp api ' + eosAPI_VERSION)


module.exports.VERSION = function () {
    console.debug(eosAPI_VERSION)
    return eosAPI_VERSION;
}

const cxpURL = process.env.SOCKET_CXP_URL || 'http://demoeos.coinxp.io:8888';
const CXP_CHAIN_IP = cxpURL;
console.info(' ------------------------- ')
console.info('cxpUrl', cxpURL);

//测试情况下， 所有测试用户均用该密钥
const PriKey = '5JFduBWtcggNQLTZMYY9wBJPqHn9C6WkSWnhdbwP37LA24KCpiV'
const PubKey = 'EOS6gt7fWEwtFKbGV33C5hN4BE7qAcwyZkR2rWDavTt5JFGj5MnSJ'

const CREATE_USER = 'create.user'
const CREATE_USER_KEY = '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3'
let CoinMaps = { "maps": [] }

/* ----------------------------------------------------------------------------------
输出接口
用户：
1.用户注册 
2.资产查询  
3.币地址查询  

充提币相关:
1.冲币记录
2.提币记录
3.提币

交易相关：
1.买入  
2.卖出  
3.撤单
4.订单信息查询

行情相关：
5. 行情委托
6. 最新价交易价
7. 交易合约清单

----------------------------------------------------------------------------------*/

function log(error, result) {

    console.debug('log result:------------------------------------------------')
    console.debug(result)
    console.debug('log error:------------------------------------------------')
    console.debug(error)

}
/** 
 * @function createAccount 创建CXP用户
 * @param {string} name    要创建的CXP用户名
 * @param {string} own_prikey  用户私钥,  公钥私钥由 genKeys 生成
 * @param {string} own_pubkey  用户公钥
 * @param {string} active_pubkey  用户 active 公钥
 * @param {string} host  CXP链地址， 可选参数 
 * @returns  {Object} { broadcast: true, ..... } 
 * @example 
 * ret = await api_cxp.createAccount(newUser, PriKey, PubKey, PubKey, host='http://testnet-bpb.coinxp.io:8888'  )

 */
const createAccount = async (name, own_prikey, own_pubkey, active_pubkey, host = null) => {

    let config = getConfig(host)
    config.keyProvider = [CREATE_USER_KEY]
    const eos = Eos(config);

    try {
        let res = await eos.transaction(tr => {
            tr.newaccount(
                {
                    creator: CREATE_USER,
                    name: name,
                    owner: own_pubkey,
                    active: active_pubkey
                }
            )
        })

        try {
            await reqUserAddress(name, 'BTC', own_prikey,null, host);
        } catch (e) {
            console.error('reqUserAddress------', e);
        }

        try {
            await reqUserAddress(name, 'ETH', own_prikey,null, host);
        } catch (e) {
            console.error('reqUserAddress------', e);
        }
        return res;
    } catch (e) {
        console.debug('-----------------------------'  );
        console.debug('createAccount ---- error ----', e);
        console.debug('-----------------------------'  );
        return e
       
    }
}




/**
 * @function queryBlance 查询用户银行资产余额 
 * @param {string} name  CXP用户名
 * @param {string} bankName   银行名称： coinxp.bank
 * @param {string} host       CXP链地址， 可选项
 * @returns {Object} { coins:
   [ { balance: 8000, locked: 0, type: 'BTC' },
     { balance: 8002, locked: 0, type: 'ETH' },
     { balance: 0, locked: 0, type: 'ZIL' } ]}
 * @example 
 * ret = await api_cxp.queryBlance(name, 'coinxp.bank', host='http://testnet-bpb.coinxp.io:8888'  )
 */
const queryBlance = async (name, bankName, host = null ) => {

    const config = getConfig(host)
    const eos = Eos(config);
    let coins = { coins: [] };
    bankName = bankName || 'coinxp.bank';


    try {
        let result = await eos.getTableRows({ "scope": name, "code": bankName, "table": "accountasset", "json": true });
        let data = result.rows
        if (data.length > 0) {
            for (let i = 0; i < data.length; i++) {
                let btcBalance = data[i];
                let Txt = btcBalance.balance
                btcBalance.balance = getValByTxt(btcBalance.balance);
                btcBalance.locked = getValByTxt(btcBalance.locked);
                btcBalance.type = getTypeByTxt(Txt) 
                data[i] = btcBalance;
            }
            coins.coins = data;
        }
        return coins;
    } catch (e) {
        return e
        //throw new Error(e);
    }
}
/**
 * @function queryBlanceExchange  查询用户在交易所资产
 * @param {string} name CXP用户名 
 * @param {string} exchangeName 数字资产交易所名称 exchange1 
 * @param {string} host  CXP链地址
 * @returns {Object} { coins:
   [ { balance: 8000, locked: 0, type: 'BTC' },
     { balance: 8002, locked: 0, type: 'ETH' },
     { balance: 0, locked: 0, type: 'ZIL' } ]}
 * @example 
 * ret = await api_cxp.queryBlanceExchange(name, 'exchange1'  )
 */
const queryBlanceExchange = async (name, exchangeName, host = null ) => {
 

    const config = getConfig(host)  

    const eos = Eos(config);
    let coins = { coins: [] };


    try {
        let result = await eos.getTableRows({ "scope": name, "code": exchangeName, "table": "accountasset", "json": true });
        let data = result.rows
        if (data.length > 0) {
            for (let i = 0; i < data.length; i++) {
                let btcBalance = data[i];
                let Txt = btcBalance.balance
                btcBalance.balance = getValByTxt(btcBalance.balance);
                btcBalance.locked = getValByTxt(btcBalance.locked);
                btcBalance.type = Txt.substring(Txt.length - 3, Txt.length);
                data[i] = btcBalance;
            }
            coins.coins = data;
        }
        return coins;
    } catch (e) {
        throw new Error(e);
    }
}


// /** 内部函数
//  * 
//  * @param {string} name   CXP用户名 
//  * @param {string} cType  币种类（币名称） 例如： ETH
//  * @param {string} priKey 私钥
//  * @param {string} callback  回调函数
//  * @param {string} host  CXP链地址
//  * @example 
//  * ret = await api_cxp.queryCoinAddr(newUser,'BTC', host='http://testnet-bpb.coinxp.io:8888'  )
//  */
const reqUserAddress = async (name, cType, priKey, callback, host = null ) => {
    let config = getConfig(host)
    config.keyProvider = [ priKey ]
 
    const eos = Eos(config);
    const account = 'useraddress';
    const actor = name;

    try {
        const res = await eos.transaction({
           
            actions: [
                {
                    account: account,
                    name: 'reqaddr',
                    authorization: [{
                        actor: actor,
                        permission: 'active'
                    }],
                    data: {
                        name: name,
                        type: cType,
                    }
                }
            ]
        });
        console.debug('res---', res);
    } catch (e) {
        throw new Error(e);
    }
}

 /**
  * @function queryCoinAddr 查询币地址
  * @param {string} name  CXP用户名 
  * @param {string} cointype 币种类 ， 比如 ETH
  * @param {string} host CXP链地址
  * @returns {string}  例：2MsU9fMAfwyy6tsVAC2wNzCGrSSbibz7y9j
  * @example 
  * ret = await api_cxp.queryCoinAddr(newUser, 'BTC',host='http://testnet-bpb.coinxp.io:8888' ); 
  */
const queryCoinAddr = async (name, cointype, host = null ) => {
 
    let config = getConfig(host)
 
    cointype = getRC20_addr(cointype)
 
    const eos = Eos(config);
    try {
        let name2 = name + '1'
        const res = await eos.getTableRows({ "scope": cointype, "code": "useraddress", "table": "table", "table_key": "name", "limit": 1, "lower_bound": name, "upper_bound": name2, "json": true })
 
        const data = res.rows;
 
        if (data.length > 0) {
  
            let recAddress = data[0]
            return recAddress['addr']
          
        } else {
            return '';
        }
    } catch (e) {
        console.debug('eosAPI - queryCoinAddr error: ', e)
        //throw new Error('eosAPI - queryCoinAddr error: ', e);
        return ''
    }
}
 
/**
 * 
 * @function  queryLastPrice 查询交易对最新价
 * @param {string} cointype  币种类 ， 比如 ETH
 * @param {string} host CXP链地址
 * @returns {object} { request_id: 79596882,
  amount: 10.27,
  price: '0.03131400000000000',
  timestamp: '1540508017936875865' }
 * @example
 * ret = await api_cxp.queryLastPrice('eth/btc')
 */
const queryLastPrice = async (cointype, host = null ) => {

    let config = getConfig(host)
    let standCointype = cointype2tablename(cointype)  //ETH/BTC -> 'eth2btc'

    const eos = Eos(config);
    try {
        const res = await eos.getTableRows({ "scope": standCointype, "code": "cxp.lp", "table": "price", "json": true })

        const data = res.rows;
        // console.debug('queryLastPrice....', data);
        if (data.length > 0) {
            let lastPrice = data[0];
            lastPrice.amount = lastPrice.amount / 100000000;
            lastPrice.price = lastPrice.price;  //update 9.10 
            // console.debug('res', lastPrice);
            return lastPrice;
            // do return data
        } else {
            return {};
        }
    } catch (e) {
        console.debug('eosAPI - queryCoinAddr error: ', e)
        //throw new Error('eosAPI - queryCoinAddr error: ', e);
        return {}
    }
}

/**
 * 
 * @function reqwithdraw 用户提币
 * @param {string} name  CXP用户名 
 * @param {string} reqid 请求ID，  调用方定义， 8位唯一
 * @param {string} addr  提币地址， 用户所要提出的币地址
 * @param {string} amount 数量
 * @param {string} type   币种类，比如 ETH
 * @param {string} priKey 用户私钥
 * @param {string} host CXP链地址
 * @returns  {Object} { broadcast: true, ..... } 
 * @example 
 * ret = await api_cxp.reqwithdraw(newUser, 1233212, '2N49rrbPiqBe67f9eoCnkcgNQPAVketz2oM', '0.01000000', 'BTC',  PriKey )
 */
const reqwithdraw = async (name, reqid, addr, amount, type, priKey, host = null ) => {
 

    let config = getConfig(host)
    config.keyProvider = [ priKey ]    

    try {
        const quantity = Number(amount).toFixed(8) + ' ' + type;
        const eos = Eos(config);
        const account = 'useraddress';
        const actor = name;
        const res = await eos.transaction({
            actions: [
                {
                    account: account,
                    name: 'reqwithdraw',
                    authorization: [{
                        actor: actor,
                        permission: 'active'
                    }],
                    data: {
                        name: name,
                        reqid: reqid,
                        addr: addr,
                        quantity: quantity

                    }
                }
            ]
        });
        console.debug('res...', res);
        return res;
    } catch (e) {
        return e;
        //throw new Error('eosAPI - reqithdraw error: ', e );
    }
}

/**
 * 
 * @function bank2change 银行个人资产转交易所
 * @param {string} name   CXP用户名 
 * @param {string} changename  交易所名称
 * @param {string} amount  数量
 * @param {string} type    币种类
 * @param {string} priKey  用户私钥
 * @param {string} host CXP链地址
 * @returns  {Object} { broadcast: true, ..... } 
 * @example
 * ret = await api_cxp.bank2change('abc', 'exchang1', 1.1, 'BTC', '5KiTgpHdj3QZQmHtefRJDR5nnProKnBPt2icZBKkLF2vWqSTQez')
 */
const bank2change = async function (name, changename, amount, type, priKey, host = null ) {
//cleos push action coinxp.bank transtoexc '[ "wm", "exchange1","500.00000000 BTC","wm BTC to exchange1"]' -p wm
    try {
 
        let config = getConfig(host)
        config.keyProvider = [ priKey ]  

        const eos = Eos(config);

        const account = 'coinxp.bank';
        const exchange = 'exchange1';
        const amountAss = Number(amount).toFixed(8) + ' ' + type;
 
        console.debug('-----------------------------------');
        const res = await eos.transaction({
            actions: [
                {
                    account: account,
                    name: 'transtoexc',
                    authorization: [{
                        actor: name,
                        permission: 'active'
                    }],
                    data: {  // user  exchange  currency  commodity  is_buy id
                        owner: name,
                        exchange: exchange,
                        quantity: amountAss,
                        memo: ''

                    }
                }
            ]
        });
        console.debug('eosAPI transtoexc res ....', res);
        return res;
    } catch (e) {
        console.debug('eosAPI transtoexc res ....', e);

        throw new Error('eosAPI - transtoexc error: ', e);
    }

}

/**
 * @function change2bank 交易所个人资产转银行
 * @param {string} name   CXP用户名 
 * @param {string} changename  交易所名称
 * @param {string} amount  数量
 * @param {string} type    类型
 * @param {string} priKey  私钥
 * @param {string} host CXP链地址
 * @returns  {Object} { broadcast: true, ..... } 
 * @example
 * ret = await api_cxp.change2bank('wm', 'exchang1', 1.1, 'BTC', '5KiTgpHdj3QZQmHtefRJDR5nnProKnBPt2icZBKkLF2vWqSTQez')
 */
const change2bank = async function (name, changename, amount, type, priKey, host = null ) {
//cleos push action coinxp.bank transfromexc '[ "zhouzheng", "exchange1","1 USA","test"]' -p zhouzheng

    try {
 
        let config = getConfig(host)
        config.keyProvider = [ priKey ]  

        const eos = Eos(config);

        const account = 'coinxp.bank';
        const exchange = 'exchange1';

        const amountAss = Number(amount).toFixed(8) + ' ' + type;
 
 
        const res = await eos.transaction({
            actions: [
                {
                    account: account,
                    name: 'transfromexc',
                    authorization: [{
                        actor: name,
                        permission: 'active'
                    }],
                    data: {  // user  exchange  currency  commodity  is_buy id
                        owner: name,
                        exchange: exchange,
                        quantity: amountAss,
                        memo: ''

                    }
                }
            ]
        });
        console.debug('eosAPI change2bank res ....', res);
        return res;
    } catch (e) {
        console.debug('eosAPI change2bank res ....', e);

        throw new Error('eosAPI - change2bank error: ', e);
    }

}



/**
 * @function buy 买入限价委托
 * @param {string} contractName 
 * @param {string} name   CXP用户名 
 * @param {string} price  价格
 * @param {string} amount 数量
 * @param {string} orderId  委托编号，调用方定义， 全局唯一，10位数字
 * @param {string} priKey   私钥
 * @param {string} exchangeName 交易所名称，比如 exchange1
 * @param {string} host CXP链地址
 * @returns  {Object} { broadcast: true, ..... } 
 * @example
 * ret = await api_cxp.buy(  'ETH/BTC', 'sim', 0.003 , 1, 666606,  '5KiTgpHdj3QZQmHtefRJDR5nnProKnBPt2icZBKkLF2vWqSTQez', 'exchange1', host='http://testnet-bpb.coinxp.io:8888' )
 */
const buy = async (contractName, name, price, amount, orderId, priKey, exchangeName, host = null) => {
    try {
        const coinTypes = getCoinTypes(contractName);
        const [target, pay] = coinTypes;

        let config = getConfig(host)
        config.keyProvider = [ priKey ]  
        const eos = Eos(config);

        const account = 'cxp.match';
        const exchange = exchangeName || 'exchange1';

        const currency = Number(price * amount).toFixed(8) + ' ' + pay;
        const commodity = (Number(amount)).toFixed(8) + ' ' + target;

        console.debug('-----------------------------------');
        const res = await eos.transaction({
            actions: [
                {
                    account: account,
                    name: 'ask',
                    authorization: [{
                        actor: name,
                        permission: 'active'
                    }],
                    data: {  // user  exchange  currency  commodity  is_buy id
                        user: name,
                        exchange: exchange,
                        currency: currency,
                        commodity: commodity,
                        is_buy: 1,
                        request_id: orderId
                    }
                }
            ]
        });
        console.debug('eosAPI buy res ....', res);
        return res;
    } catch (e) {
        console.debug('eosAPI - buy error: ', e);
        return e;
        //throw new Error('eosAPI - buy error: ', e);
    }
}

/**
 * @function sell 卖出限价委托
 * @param {string} contractName  交易对
 * @param {string} name   CXP用户名 
 * @param {string} price  价格
 * @param {string} amount 数量
 * @param {string} orderId 委托编号， 调用方定义，全局唯一  10位数字
 * @param {string} priKey  私钥
 * @param {string} exchangeName 交易所编号 
 * @param {string} host CXP链地址
 * @returns  {Object} { broadcast: true, ..... } 
 * @example
 * ret = await api_cxp.sell( 'CXP/BTC', 'sim', 1.2 , 11, 777705,  '5KiTgpHdj3QZQmHtefRJDR5nnProKnBPt2icZBKkLF2vWqSTQez', 'exchange1', host='http://testnet-bpb.coinxp.io:8888'  )
 */
const sell = async (contractName, name, price, amount, orderId, priKey, exchangeName, host = null) => {
    try {
        const coinTypes = getCoinTypes(contractName);
        const [target, pay] = coinTypes;

        let config = getConfig(host)
        config.keyProvider = [ priKey ]  

        const eos = Eos(config);
        const account = 'cxp.match';
        const actor = 'cxp.match';
        const exchange = exchangeName || 'exchange1';

        const currency = Number(price * amount).toFixed(8) + ' ' + pay;
        const commodity = (Number(amount)).toFixed(8) + ' ' + target;

        const res = await eos.transaction({
            actions: [
                {
                    account: account,
                    name: 'ask',
                    authorization: [{
                        actor: name,
                        permission: 'active'
                    }],
                    data: {  // user  exchange  currency  commodity  is_buy id
                        user: name,
                        exchange: exchange,
                        currency: currency,
                        commodity: commodity,
                        is_buy: 0,
                        request_id: orderId,
                    }
                }
            ]
        });
        console.debug('res', res);
        return res;
    } catch (e) {
        console.error('eosAPI - sell error: ', e);
        return e;
        throw new Error('eosAPI - sell error: ', e);
    }
}

/**
 * @function cancel 委托撤销
 * @param {string} name   CXP用户名 
 * @param {string} orderId  原委托编号
 * @param {string} priKey  私钥
 * @param {string} host CXP链地址
 * @returns  {Object} { broadcast: true, ..... } 
 * @example
 * ret = await api_cxp.cancel('sim',  666606, '5KiTgpHdj3QZQmHtefRJDR5nnProKnBPt2icZBKkLF2vWqSTQez', host='http://testnet-bpb.coinxp.io:8888');
 */
const cancel = async (name, orderId, priKey, host = null) => {
// cleos push action cxp.api cancel '["wm", 1]' -p wm
    try {
        let config = getConfig(host)
        config.keyProvider = [ priKey ]  
        const eos = Eos(config);
        const account = 'cxp.api';
        const res = await eos.transaction({
            actions: [
                {
                    account: account,
                    name: 'cancel',
                    authorization: [{
                        actor: name,
                        permission: 'active'
                    }],
                    data: {  // user  exchange  currency  commodity  is_buy id
                        request_key: orderId,
                        user: name,

                    }
                }
            ]
        }).catch(e => {
            //throw new Error('eosAPI... - cancel error site 1: ', e);
            console.debug('eosAPI... - cancel error site 1: ', e)
            return { 'error': e }
        })
        return res;
    } catch (e) {
        //throw new Error('eosAPI - cancel error: site 2', e);
        console.debug('eosAPI... - cancel error site 2: ', e)
        return { 'error': e }
    }
}


//内部函数
const cancelAll = async (name, priKey, host = null) => {

    let orderbook = await getOrderbookbuy('eth2btc')
    for (let index = 0; index < orderbook.bids.length; index++) {
        let order = orderbook.bids[index];
        console.debug('cancel:', name, order.request_id)
        await cancel(name, order.request_id, priKey)

    }

    orderbook = await getOrderbooksell('eth2btc', host = null)
    for (let index = 0; index < orderbook.asks.length; index++) {
        let order = orderbook.asks[index];
        await cancel(name, order.request_id, priKey)
    }

}

 

/**
 * @function getOrderbookbuy 获取交易对的委买 10 档行情
 * @param {string} contractName 交易对名称
 * @param {string} host CXP链地址
 * @returns {object}  { bids:
   [ { price: 0.034407, amount: 10.07 },
     { price: 0.034545, amount: 13.35 },
     { price: 0.034579, amount: 21.04 },
     { price: 0.034614, amount: 83.26 },
     { price: 0.034648, amount: 41.78 },
     { price: 0.034682, amount: 10.38 },
     { price: 0.034717, amount: 63.96 },
     { price: 0.0994, amount: 20.38 },
     { price: 0.0999, amount: 10.49 },
     { price: 0.1005, amount: 10.88 } ] }
 * @example
 * ret =  await  api_cxp.getOrderbookbuy('CXP/BTC')  
 */
const getOrderbookbuy = async (contractName, host = null) => {
    let config = getConfig(host)
    const eos = Eos(config);
    //cleos get table cxp.match btc2eth buybook
    //cleos get table cxp.lp eth2btc  abuybook

    try {
        let orderbook = { ' bids': [] }
        let tableName = cointype2tablename(contractName);
        let result = await eos.getTableRows({
            "scope": tableName, "code": "cxp.lp", "table": "abuybook", "limit": 15,
            //"key_type": "i64",
            //"index_position": "2",
            "json": true
        });

        // console.debug(tableName,'  ' , result.rows )

        let data = result.rows
        console.debug('buybook rows : ', data.length)
        //printPriceList(result.rows)
        let sortdata = sortOrderbook(result.rows, false)


        //printPriceList( sortdata )
        orderbook.bids = standOrderbook(sortdata);
        //printPriceList(orderbook.bids)
        return orderbook;

    } catch (e) {
        throw new Error(e);
    }

}

/**
 * @function getOrderbooksell 获取交易对的委卖行情，10档
 * @param {string} contractName 交易对名称
 * @param {string} host CXP链地址
 * @returns {object}  { bids:
   [ { price: 0.034407, amount: 10.07 },
     { price: 0.034545, amount: 13.35 },
     { price: 0.034579, amount: 21.04 },
     { price: 0.034614, amount: 83.26 },
     { price: 0.034648, amount: 41.78 },
     { price: 0.034682, amount: 10.38 },
     { price: 0.034717, amount: 63.96 },
     { price: 0.0994, amount: 20.38 },
     { price: 0.0999, amount: 10.49 },
     { price: 0.1005, amount: 10.88 } ] }
 * @example
 * ret =  await  api_cxp.getOrderbooksell('CXP/BTC')
 */
const getOrderbooksell = async (contractName, host = null) => {
    let config = getConfig(host)


    const eos = Eos(config);
    //cleos get table cxp.match btc2eth sellbook   coinName
    try {
        let tableName = cointype2tablename(contractName);
        let orderbook = { 'asks': [] }
        let result = await eos.getTableRows({
            "scope": tableName, "code": "cxp.lp", "table": "asellbook", "limit": 15,
            //"key_type": "i64",
            //"index_position": "2", 
            "json": true
        });

        console.debug('sellbook rows : ', result.rows.length)

        // console.debug( result.rows.slice(0,50)  )
        //printPriceList(  result.rows  )
        let sortdata = sortOrderbook(result.rows, true)
        //printPriceList( sortdata )

        orderbook.asks = standOrderbook(sortdata);
        //printPriceList(orderbook.asks)

        return orderbook;

    } catch (e) {
        throw new Error(e);
    }

}
 

/**
 * @function getCoins 获取支持的币种
 * @param {string} callback  回调函数
 * @param {string} host CXP链地址
 * @returns {object} { rows:       
    [   { "supply": "0.00000000 AE"
        },{
        "supply": "0.00000000 BNB"
        },{
        "supply": "0.00000000 BTC"
        }, {...} ], more: false }
 * @example
 * ret =  await  api_cxp.getCoins( log, host='http://testnet-bpb.coinxp.io:8888' )
 */
//cleos7 get table coinxp.bank coinxp.bank stat
const getCoins = async (  callback, host = null) => {
    let config = getConfig(host)
    const eos = Eos(config);

 
    let Tradepairs = {   }

    try {
 
        const res = await eos.getTableRows({
            "scope": "coinxp.bank", "code": "coinxp.bank", "table": "stat",
            "json": true, "limit": 500
        });

        Coins = res 
        if (Coins.length > 0) {
            //let btcBalance = data[i]
        }
        callback('', Coins)
        return Coins;
    } catch (e) {
        callback(e, '')
        //throw new Error(e);
    }
}

/**
 * @function getTradepair 获取支持的交易对
 * @param {string} callback  回调函数
 * @param {string} host CXP链地址
 * @returns {object} { rows:       
    [{  "currency": "BTC",
      "commodity": "AE",
      "timestamp": "1539081909584290818"
    },{
      "currency": "ETH",
      "commodity": "AE",
      "timestamp": "1539081912074136061"
    }, {...} ], more: false }
 * @example
 * ret =  await  api_cxp.getTradepair( host='http://testnet-bpb.coinxp.io:8888' )
 */
const getTradepair = async ( callback, host = null) => {
    let config = getConfig(host)
    const eos = Eos(config);

 
    let Tradepairs = {   }

    try {
 
        const res = await eos.getTableRows({
            "scope": "coin", "code": "cxp.match", "table": "coin",
            "json": true, "limit": 500
        });

        Tradepairs = res 
        if (Tradepairs.length > 0) {
            //let btcBalance = data[i]
        }
        callback('', Tradepairs)
        return Tradepairs;
    } catch (e) {
        callback(e, '')
        //throw new Error(e);
    }
    
}


/**
 * @function genKeys  生成密钥对
 * @example 
 * ret = await api_cxp.genKeys()
 */
const genKeys = async ( ) => {

    let ret = await EosAPI.Keygen.generateMasterKeys()
    return ret;

}

/**
 * @function getUserOrders 获取用户的成交记录
 * @param {string} name   CXP用户名 
 * @param {string} callback  回调函数
 * @param {string} host CXP链地址
 * @returns {object} { rows:       
    [{ request_id: 24199,
       orderbook_key: 31680,
       scope: '6222325301620244480',
       currency_symbol: 1129595400,
       commodity_symbol: 1213482248,
       is_buy: 1,
       traded_currency: 0,
       traded_commodity: 0,
       price: 3.4031e-10,
       pending_commodity: 10.95,
       status: 4,
       timestamp: '1539156729557237062' }, {...} ], more: false }
 * @example
 * ret =  await  api_cxp.getUserOrders('sim',log, host='http://testnet-bpb.coinxp.io:8888' )
 */
const getUserOrders = async (name, callback, host = null) => {

    let config = getConfig(host)
    const eos = Eos(config);

    //cleos get table cxp.odb wm ord8erdb
    let orders = { 'rows': [] }

    try {
 
        const res = await eos.getTableRows({
            "scope": name, "code": "cxp.odb", "table": "orderdb",
            "json": true, "limit": 500
        });

        orders.rows = standTrade(sortUserTrade(res.rows))
        if (orders.length > 0) {
            //let btcBalance = data[i]
        }
        callback('', orders)
        return orders;
    } catch (e) {
        callback(e, '')
        //throw new Error(e);
    }
}


/**
 * @function getDeposits 获取用户的充币记录
 * @param {string} coinName 币种  比如 ETH
 * @param {string} startid  充值记录起始位置
 * @param {string} callback 回调函数
 * @param {string} host CXP链地址
 * @returns {object}  { rows:
   [ { id: 0,
       user: 'cxpkrvjtw',
       from: '2N24Um3rWrzY8wKc6kKD1ouU8AmtUkx5ake',
       quantity: '0.10000000 BTC',
       txhash: '228ab72176c8da5f3ebfbc867de2b0965447be162e5b00833f170f4bc66db2a0',
       timestamp: '1539134473116606504',
       is_valid: 1,
       validators: [Array] }, {...} ], more: false }
 * @example
 * ret = await api_cxp.getDeposits('BTC', 0,  log,  host='http://testnet-bpb.coinxp.io:8888')
 */
const getDeposits = async (coinName, startid, callback, host = null) => {
    let config = getConfig(host)
    const eos = Eos(config);
    //cleos get table deposit.tx ETH transactions

    try {
        const res = await eos.getTableRows({
            "scope": coinName, "code": "deposit.tx", "table": "transactions",
            "lower_bound": startid, "json": true, "limit": 500
        });

        callback('', res)
        return res;
    } catch (e) {
        callback(e, '')
        //throw new Error(e);
    }

}

/**
 * @function getWithdraws 获取用户的提币记录
 * @param {string} coinName  币种  比如 ETH
 * @param {string} startid   充值记录起始位置
 * @param {string} callback 回调函数
 * @param {string} host CXP链地址
 * @returns {object} ret: { rows:
   [ { id: 0,
       reqid: 69242155,
       user: 'cxpkrvjtw',
       to: '2N24Um3rWrzY8wKc6kKD1ouU8AmtUkx5ake',
       quantity: '0.01000000 BTC',
       txhash: '63b2febff02cd79c32000edd69045b3bb63d1aad850fd29433895dd900f21d2d',
       status: 2,
       executor: 'bpc',
       blocknum: 111065,
       timestamp: '1539227796698374882',
       validators: [Array],
       rejecters: [] },    {...} ], more: false }
 * @example
 * ret = await api_cxp.getWithdraws('BTC', 0,  log,  host='http://testnet-bpb.coinxp.io:8888') 
 */
const getWithdraws = async (coinName, startid, callback, host = null) => {
    let config = getConfig(host)
    const eos = Eos(config);

    //cleos get table withdraw ETH withdrawals
    try {

        const res = await eos.getTableRows({
            "scope": coinName, "code": "withdraw", "table": "withdrawals",
            "lower_bound": startid, "json": true, "limit": 500
        });


        callback('', res)
        return res;
    } catch (e) {
        callback(e, '')
        //throw new Error(e);
    }
}

//内部函数   获得配置信息
const getConfig = ( host )=>{
    let cxpurl = CXP_CHAIN_IP
    if (host != null) {
        cxpurl = host
    }
    let config = {
        httpEndpoint: cxpurl,
        expireInSeconds: 60,
        broadcast: true,
        debug: false,
        sign: true
    }
    return config;
}

//内部函数   
const checkReq2Chain = function (errObj, responeObj) {
    let ret = {
        isOver: false,
        transaction_id: 0,
        serverDt: '017-01-01T00:00:00',
        ref_block_num: 0,
        ref_block_prefix: 0,
        err_code: '00',
        err_msg: ''
    }
    try {
        if (responeObj.broadcast == true) {
            ret.isOver = true;
            ret.transaction_id = responeObj.transaction_id;
            ret.serverDt = responeObj.transaction.expiration;
        } else {
            //console.debug('checkReq2Chain ------', errObj);
            if (errObj && errObj.error) {
                //console.debug('checkReq2Chain ------', errObj.error);
                ret.err_code = errObj.error.code;
                ret.err_msg = errObj.error.what;
            }
        }
    } catch (err) {
        console.debug('checkReq2Chain exception:');
        console.debug(err);
        //ret.err_code = errObj.error.code;
        //ret.err_msg = errObj.error.what;
        //code":500,"message":"Internal Service Error","error":{"code":3050001,"name":"account_name_exists_exception","what":"account name already exists","details":[]}}
    }
    return ret;
}


//内部函数  获得 BTC 字符
const getTypeByTxt = function (TxtVal) {
    let cointype = TxtVal.substring(TxtVal.length - 4, TxtVal.length);
    return cointype.replace(/^\s+|\s+$/g,"");
  
}

//内部函数  去掉 BTC 字符
const getValByTxt = function (TxtVal) {
    return parseFloat(TxtVal.substring(0, TxtVal.length - 4))
}


//内部函数 获取合约对应的 买入货币和支付货币  ETH/BTC --> ['ETH', 'BTC']
const getCoinTypes = (coinType ) => {
    try {
        let c = coinType.split('/');
        if (c.length) {
            return [c[0], c[1]];
        }
        throw new Error('coinTypes error: ', coinType);
    } catch (e) {
        throw new Error('coinTypes error: ', coinType);
    }
}

//内部函数 ETH/BTC --> eth2btc
const cointype2tablename = (coinType) => {
    try {
        let c = coinType.split('/');
        if (c.length) {
            let retData = c[0] + '2' + c[1];
            return retData.toLowerCase();
        }
        return 'eth2btc';
    } catch (e) {
        throw new Error('coinTypes error: ', coinType);
    }
    return 'eth2btc';
}

//orderbook 数据处理
const standOrderbook = function (orderArr) {

    orderArr.forEach((item, index, arr) => {
        //item.price = item.price / 100000000.0   
        item.amount = item.amount / 100000000.0

        item.price = Number((item.price / 1.0).toFixed(8));
        item.amount = Number((item.amount / 1.0).toFixed(8));

    })

    let orderArr_level10 = []
    let lastOrder = ''

    for (let index = 0; index < orderArr.length; index++) {
        //orderArr.forEach(( item, index, arr )=>{
        let item = orderArr[index]
        if (index == 0) {
            orderArr_level10.push(deepClone(item))
            lastOrder = deepClone(item)
        }
        else {

            if (lastOrder.price == item.price) {

                lastOrder.amount += item.amount
                orderArr_level10.pop()
                orderArr_level10.push(deepClone(lastOrder))

            } else {
                orderArr_level10.push(deepClone(item))
                lastOrder = deepClone(item)
                if (orderArr_level10.length >= 10)
                    break
            }
        }

    }
    return orderArr_level10
}

//trade 数据处理
const standTrade = function (tradeArr) {
    tradeArr.forEach((item, index, arr) => {
        item.price = item.price / 100000000.0
        item.traded_currency = item.traded_currency / 100000000.0
        item.pending_commodity = item.pending_commodity / 100000000.0
        item.traded_commodity = item.traded_commodity / 100000000.0        
        //status 处理   0 , 1,  2   ==> 0 , 1, 2, 3, 4
        // 1: '已申报',
        // 2: '部分成交',
        // 3: '完全成交',
        // 4: '撤单'

        if (item.status == 0 && item.traded_commodity != 0) {
            item.status = 2;
            return
        }

        if (item.status == 0 && item.traded_commodity == 0) {
            item.status = 1;
            return
        }


        if (item.status == 1) {
            item.status = 3;
            return
        }

        if (item.status == 2) {
            item.status = 4;
            return
        }

    })
    return tradeArr
}

//orderbook 排序
const sortOrderbook = function (orderArr, asc) {
    /**/
    orderArr = orderArr.sort((v, w) => {

        if (asc == true)
            return v.price - w.price;
        else
            return w.price - v.price;
    })

    return orderArr

}

//userTrade 排序
const sortUserTrade = function (tradeArr) {
    /* */
    tradeArr = tradeArr.sort((v, w) => {
        return v.timestamp > w.timestamp
    })

    return tradeArr
}


const getRC20_addr = function (cointype) {

    let file = __dirname + "/coinmap.json";
    try {
        console.debug(file);
        CoinMaps = JSON.parse(fs.readFileSync(file));
    } catch (err) {
        console.debug(err);
    }

    //{"coinname":"CXP", "cointype":"ETH"},
    let maplist = CoinMaps["maps"]
    //maplist.forEach(item => {
    for (let index = 0; index < maplist.length; index++) {
        item = maplist[index]
        // console.debug( item )
        if (item["coinname"] == cointype) {
            return item["cointype"];
        }
    };

    return cointype;

}


function deepClone(obj) {
    let _obj = JSON.stringify(obj),
        objClone = JSON.parse(_obj);
    return objClone
}



const printPriceList = function (arr) {
    //arr.forEach (  (item, index, arr)=>{
    for (let index = 0; index < arr.length; index++) {
        let item = arr[index]
        console.debug(index, '  ', item.price)
    }
}

var a = [{ time: 10 }, { time: 2 }, { time: 6 }, { time: 1 }]

a = a.sort((v, w) => {
    return v.time > w.time
})


//////////////////////////////////////////////////////////////////////////////////////////
//exports：

module.exports.createAccount = createAccount;
module.exports.reqUserAddress = reqUserAddress;
module.exports.queryBlance = queryBlance;
module.exports.queryCoinAddr = queryCoinAddr;
module.exports.queryLastPrice = queryLastPrice;
module.exports.reqwithdraw = reqwithdraw;
module.exports.buy = buy;
module.exports.sell = sell;
module.exports.cancel = cancel;
module.exports.checkReq2Chain = checkReq2Chain;
module.exports.getOrderbookbuy = getOrderbookbuy;
module.exports.getOrderbooksell = getOrderbooksell;
module.exports.getUserOrders = getUserOrders;
module.exports.queryBlanceExchange = queryBlanceExchange;
module.exports.getDeposits = getDeposits;
module.exports.getWithdraws = getWithdraws;
module.exports.getCoins = getCoins;
module.exports.getTradepair = getTradepair;

module.exports.bank2change = bank2change;
module.exports.change2bank = change2bank;
module.exports.genKeys = genKeys;

