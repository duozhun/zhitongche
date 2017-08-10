// ==UserScript==
// @name         databank 
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  shows how to use babel compiler
// @author       You
// @run-at document-body
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/6.18.2/babel.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/6.16.0/polyfill.js
// @require      https://cdn.bootcss.com/string.js/3.3.3/string.min.js
// @match        https://databank.yushanfang.com/*
// ==/UserScript==

/* jshint ignore:start */
var inline_src = (<><![CDATA[
/* jshint ignore:end */
    /* jshint esnext: false */
    /* jshint esversion: 6 */

    const addUrl = document.URL;
    const crowdId = S(addUrl).between('crowdId=','&');
    const date = S(addUrl).between('date=','&');
    const token = document.querySelector('meta[token]').getAttribute('token')

    function jsonToExcel(content) {
      let resultString = "tagTypeName,tagValueName,cnt,rate\n"
      for (let i in content) {
        let tagTypeName = content[i].tagTypeName;
        let tagData = content[i].tagData;
        for (let j in tagData) {
          let cnt = tagData[j].cnt;
          let rate = tagData[j].rate;
          let name = tagData[j].tagValueName;
          let newline = `${tagTypeName},${name},${cnt},${rate}\n`
          resultString = resultString + newline
        }
      }
      return resultString;
    }

    function download(data, filename, type) {
      var file = new Blob(["\ufeff"+data], { type: type });
      if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
      else { // Others
        var a = document.createElement("a"),
          url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 0);
      }
    }

    function sendURL(url, formData) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
            xhr.open('POST', url);
            // xhr.setRequestHeader('Content-type','application/x-www-form-urlencoded; charset=UTF-8');
            // xhr.setRequestHeader('content-type','application/json')
            // xhr.setRequestHeader('x-requested-with','XMLHttpRequest')
            xhr.setRequestHeader('x-csrf-token',token)
            xhr.send(formData);
            xhr.onreadystatechange = ev => {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    const json = JSON.parse(xhr.response);
                    resolve(json);
                }
            };
        });
    }


    function getGrowd() {
        const formData = {};
        formData.contentType = "application/json";
        formData.path = "/crowd/perspective";
        formData.perspectiveParamStr = `{"bizType":"CUSTOM_ANALYSIS","paramsMap":{"DATE":"${date} 00:00:00","CROWD_ID":"${crowdId}"},"tagTypes":["pred_gender","pred_age_level","pred_career_type","pred_life_stage","common_receive_province_180d","derive_pay_ord_amt_6m_015_range","trade_hour_most","tm_level","vip_level_name","interest_prefer"]}`;
        const listUrl = 'https://databank.yushanfang.com/api/ecapi';
        const promise = sendURL(listUrl, JSON.stringify(formData));
        promise.then(data => {
          download(jsonToExcel(data.data),`数据银行人群画像-${date}.csv`,'json');
        });
    }

    const wrapperDiv = document.createElement('div');
    wrapperDiv.innerHTML = `
    <button type="button" class="next-btn next-btn-primary next-btn-medium" id="download">下载</button>
    `

    let id = setInterval(() => {

        if (document.querySelector('.sidebar') !== null) {
            clearInterval(id);
            const parent = document.querySelector('.crowd-portrait-header');
            const oldSpan = parent.querySelector('div');
            parent.insertBefore(wrapperDiv, oldSpan);

            if (addUrl.match('https://databank.yushanfang.com/#/CrowdPortrait*.') !== undefined) {
                document.querySelector('#download').aGddEventListener('click',() => {
                  getGrowd()
                })
            }
        }
    }, 1000);


/* jshint ignore:start */
]]></>).toString();
    var c = Babel.transform(inline_src, { presets: ["es2015", "es2016"] });
    eval(c.code);
/* jshint ignore:end */