import axios from 'axios';

// let domain = "https://gameapiv2.gggamer.org";
let domain = "https://gametestapi.gggamer.org";

export async function syncTicket(auth_token: string, _data: string) {
  const config = {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${auth_token}`,
    },
  };
  //console.log("syncTicket:", _data);
  return axios.post(domain+"/sync-ticket", _data, config).catch(resp => ({ ...resp.response, error: resp.response.data?.message || 'Error found!' }));
}
export async function userme(auth_token: string) {
  const config = {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${auth_token}`,
    },
  };
  //console.log(auth_token);
  return axios.get(domain+"/me", config).catch(resp => ({ ...resp.response, error: resp.response.data?.message || 'Error found!' }));
}


export async function gameover(auth_token: string, _data: string) {
  const config = {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${auth_token}`,
    },
  };
  //console.log("syncTicket:", _data);
  return axios.post(domain+"/gameover", _data, config).catch(resp => ({ ...resp.response, error: resp.response.data?.message || 'Error found!' }));
}