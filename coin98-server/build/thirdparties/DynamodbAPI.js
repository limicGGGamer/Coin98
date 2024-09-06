"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncTicket = syncTicket;
exports.userme = userme;
exports.gameover = gameover;
const axios_1 = __importDefault(require("axios"));
// let domain = "https://gameapiv2.gggamer.org";
let domain = "https://gametestapi.gggamer.org";
async function syncTicket(auth_token, _data) {
    const config = {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Authorization: `Bearer ${auth_token}`,
        },
    };
    //console.log("syncTicket:", _data);
    return axios_1.default.post(domain + "/sync-ticket", _data, config).catch(resp => ({ ...resp.response, error: resp.response.data?.message || 'Error found!' }));
}
async function userme(auth_token) {
    const config = {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Authorization: `Bearer ${auth_token}`,
        },
    };
    //console.log(auth_token);
    return axios_1.default.get(domain + "/me", config).catch(resp => ({ ...resp.response, error: resp.response.data?.message || 'Error found!' }));
}
async function gameover(auth_token, _data) {
    const config = {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Authorization: `Bearer ${auth_token}`,
        },
    };
    //console.log("syncTicket:", _data);
    return axios_1.default.post(domain + "/gameover", _data, config).catch(resp => ({ ...resp.response, error: resp.response.data?.message || 'Error found!' }));
}
