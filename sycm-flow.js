// ==UserScript==
// @name         New ES6-Userscript
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  shows how to use babel compiler
// @author       You
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/6.18.2/babel.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/6.16.0/polyfill.js
// @match     https://sycm.taobao.com/ipoll/*

// ==/UserScript==

/* jshint ignore:start */
var inline_src = (<><![CDATA[
/* jshint ignore:end */
    /* jshint esnext: false */
    /* jshint esversion: 6 */
    const token = document.querySelector('meta[name="microdata"]').content.match(new RegExp('legalityToken=([^&]*)'))[1].split(';')[0];

    function getDataLabel() {
      const shopName = document.querySelector('.current-shop-item-title').innerText;
      var date = document.querySelector('.data-value.num').innerText;

      return `${shopName} - ${date} - `;
    }

    function getSummaryData() {
      const promises = [
        'https://sycm.taobao.com/ipoll/datawar/getDiffIndex.json?index=payAmt,uv,addCartItemCnt,itemFavCnt,payBuyerCnt&token=',
        'https://sycm.taobao.com/ipoll/datawar/getPayamtRank.json?device=0&limit=50&page=1&token=',
        'https://sycm.taobao.com/ipoll/datawar/getUvRank.json?device=0&limit=50&page=1&token=',
        'https://sycm.taobao.com/ipoll/datawar/getUvRank.json?device=1&limit=50&page=1&token=',
        'https://sycm.taobao.com/ipoll/datawar/getUvRank.json?device=2&limit=50&page=1&token='
      ].map((url) => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.open('GET', `${url}${token}`);

          xhr.send();

          xhr.onreadystatechange = ev => {
            if (xhr.readyState === 4 && xhr.status === 200) {
              const json = JSON.parse(xhr.response);

              resolve(json.data.data);
            }
          };
        });
      });

      Promise.all(promises).then(data => {
        download(JSON.stringify({
          summary: data[0],
          payamtRank: data[1],
          uvRank: data[2],
          uvPCRank: data[3],
          uvMobileRank: data[4]
        }), getDataLabel() + '概览和竞店排行.json', 'json');
      });
    }

    function getCompetitiveData() {
      const xhr = new XMLHttpRequest();

      xhr.open('GET', 'https://sycm.taobao.com/ipoll/datawar/getUvRank.json?device=1&limit=40&page=1&token=' + token);

      xhr.send();

      xhr.onreadystatechange = ev => {
        if (xhr.readyState === 4 && xhr.status === 200) {
           const json = JSON.parse(xhr.response);
           const list = json.data.data.list;
           const promises = list.map((item) => {
             return new Promise((resolve, reject) => {
                 const pcXhr = new XMLHttpRequest();
                 const mobileXhr = new XMLHttpRequest();
                 const total = {};

                 pcXhr.open('GET', `https://sycm.taobao.com/ipoll/live/source/getCompetitorFlowSource.json?competitorUserId=${item.userId}&device=1&limit=100&page=1&token=${token}`);
                 pcXhr.send();
                 mobileXhr.open('GET', `https://sycm.taobao.com/ipoll/live/source/getCompetitorFlowSource.json?competitorUserId=${item.userId}&device=2&limit=100&page=1&token=${token}`);
                 mobileXhr.send();

                 pcXhr.onreadystatechange = ev => {
                   if (pcXhr.readyState === 4 && pcXhr.status === 200) {
                     const pcJson = JSON.parse(pcXhr.response);

                     total.pc = pcJson.data.data.list;

                     if (total.mobile) {
                       resolve(total);
                     }
                   }
                };

                mobileXhr.onreadystatechange = ev => {
                   if (mobileXhr.readyState === 4 && mobileXhr.status === 200) {
                     const mobileJson = JSON.parse(mobileXhr.response);

                     total.mobile = mobileJson.data.data.list;

                     if (total.pc) {
                       resolve(total);
                     }
                   }
                };
             });
           });

           Promise.all(promises).then((data) => {
              download(JSON.stringify(list.map((item, index) => {
                item.list = data[index];

                return item;
              })), getDataLabel() + '竞店来源构成.json', 'json');
           });
        }
      };
    }

    const wrapperDiv = document.createElement('div');
    const button1 = document.createElement('button');
    const button2 = document.createElement('button');

    wrapperDiv.style.cssText = `
      position: fixed;
      top: 50%;
      right: 160px;
      z-index: 9999;
    `;

    button1.innerText = '获取概览和竞店排行';
    button1.style.cssText = `
      display: block;
      margin-bottom: 15px;
      padding: 10px;
      color: #fff;
      border-radius: 5px;
      border: none;
      background-color: #6966FB;
      cursor: pointer;
    `;
    button2.innerText = '获取竞店来源构成';
    button2.style.cssText = `
      display: block;
      padding: 10px;
      color: #fff;
      border-radius: 5px;
      border: none;
      background-color: #6966FB;
      cursor: pointer;
    `;

    button1.onclick = getSummaryData;
    button2.onclick = getCompetitiveData;
    wrapperDiv.appendChild(button1);
    wrapperDiv.appendChild(button2);

    document.body.appendChild(wrapperDiv);

function download(data, filename, type) {
    var file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
                url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}

/* jshint ignore:start */
]]></>).toString();
var c = Babel.transform(inline_src, { presets: [ "es2015", "es2016" ] });
eval(c.code);
/* jshint ignore:end */

