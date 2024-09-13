"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userinfo = userinfo;
exports.transferWallet = transferWallet;
exports.ReportGameInfo = ReportGameInfo;
exports.getGamePass = getGamePass;
exports.payGamePass = payGamePass;
exports.gameStart = gameStart;
const axios_1 = __importDefault(require("axios"));
axios_1.default.defaults.baseURL = 'https://api.elfin.games';
// axios.defaults.baseURL = 'https://api-testnet.elfin.games';
axios_1.default.defaults.headers.common['InvocationType'] = "Event";
const token = process.env.ENCRYPT_KEY;
const APIkey = process.env.ACCESS_KEY_ID;
const APIsecret = process.env.ACCESS_KEY_SECRET;
const topicArn = process.env.TOPIC_ARN;
console.log({
    token,
    APIkey,
    APIsecret,
    topicArn
});
async function userinfo(auth_token) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth_token}`
        }
    };
    return axios_1.default.get("/oauth2/userinfo", config).catch(resp => ({ ...resp.response, error: resp.response.data?.message || 'Error found!' }));
}
async function transferWallet(auth_token, signature_data) {
    const config = {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': `Bearer ${auth_token}`
        }
    };
    console.log("Signature data:", signature_data);
    return axios_1.default.post("/oauth2/transfer/token", JSON.parse(signature_data), config).catch(resp => ({ ...resp.response, error: resp.response.data?.message || 'Error found!' }));
}
async function ReportGameInfo(auth_token, data) {
    const config = {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': `Bearer ${auth_token}`
        }
    };
    /*const data = [{
        "userId": userId,　//用户ID，＊必需
        "gameSessionId": gameSessionId,　//游戏会话ID，＊必需
        "startedAt": startedAt, //对局开始时间，毫秒时间戳，＊必需
        "endedAt": endedAt, //对局结束时间，毫秒时间戳，＊必需
        "result": result, //游戏结果，三种结果（win,lose,draw）选其一。＊必需
        "serviceFee":0.1,//游戏费用,
        "extra": extra?extra:{} //游戏传递额外信息，JSON对象
    }]; */
    console.log("game over data check:", data);
    return axios_1.default.post("/oauth2/game/report", data, config).catch(resp => ({ ...resp.response, error: resp.response.data?.message || 'Error found!' }));
}
async function getGamePass(auth_token) {
    const config = {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': `Bearer ${auth_token}`
        }
    };
    return axios_1.default.get("/oauth2/game/pass", config).catch(resp => ({ ...resp.response, error: resp.response.data?.message || 'Error found!' }));
}
async function payGamePass(auth_token, _data) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth_token}`
        }
    };
    return axios_1.default.post("/oauth2/game/pass/pay", JSON.parse(_data), config).catch(resp => ({ ...resp.response, error: resp.response.data?.message || 'Error found!' }));
}
async function gameStart(auth_token, passId) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth_token}`
        }
    };
    const data = {
        "passId": passId
    };
    return axios_1.default.post("/oauth2/game/start", data, config).catch(resp => ({ ...resp.response, error: resp.response.data?.message || 'Error found!' }));
}
