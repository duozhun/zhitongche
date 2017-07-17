// ==UserScript==
// @name         zhitongche 
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  shows how to use babel compiler
// @author       npc
// @run-at document-body
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/6.18.2/babel.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/6.16.0/polyfill.js
// @require      https://cdn.bootcss.com/string.js/3.3.3/string.min.js
// @match        https://subway.simba.taobao.com/*
// ==/UserScript==

/* jshint ignore:start */
var inline_src = (<><![CDATA[
/* jshint ignore:end */
    /* jshint esnext: false */
    /* jshint esversion: 6 */

    let token;
    const addUrl = document.URL;
    const campaignId = S(addUrl).between('campaignId=','&');
    const adGroupId = S(addUrl).between('adGroupId=');
    let wordId = [];


    function sendURL(url,formData) {
        return new Promise( (resolve , reject ) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url);
            // xhr.setRequestHeader('Content-type','application/x-www-form-urlencoded; charset=UTF-8');
            // xhr.setRequestHeader('accept','application/json, text/javascript, */*; q=0.01')
            // xhr.setRequestHeader('x-requested-with','XMLHttpRequest')
            xhr.send(formData);
            xhr.onreadystatechange = ev => {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    const json = JSON.parse(xhr.response);
                    resolve(json);
                }
            };
        });
    }

    function getToken(flag=true) {
        let formData = new FormData();
        formData.append('_referer', '/home');
        const userUrl = 'https://subway.simba.taobao.com/bpenv/getLoginUserInfo.htm';
        const promise = sendURL(userUrl, formData);
        promise.then(data => {
            token = data.result.token;
        }).then(()=>{
            if (flag===true) {
                getWordList(campaignId, adGroupId);
            }
        });
    }

    function getWordList(cId,aId) {
        let formData = new FormData();
        formData.set('campaignId',cId);
        formData.set('adGroupId',aId);
        formData.set('queryWord','');
        formData.set('queryType',0);
        formData.set('sla','json');
        formData.set('isAjaxRequest','true');
        formData.set('token',token);
        formData.set('_referer',`/campaigns/standards/adgroups/items/detail?tab=bidword&campaignId=${cId}&adGroupId=${aId}`);
        const listUrl = 'https://subway.simba.taobao.com/bidword/list.htm';
        const promise = sendURL(listUrl, formData);
        promise.then(data => {
            for( let r in data.result ) {
                wordId.push(data.result[r].keywordId);
            }
        }).then(() => {
            getScore(cId,aId,wordId);
        });
    }

    function getScore(cId,aId,wId) {
        let formData = new FormData();
        formData.set('adGroupId',aId);
        formData.set('bidwordIds',JSON.stringify(wId));
        formData.set('sla','json');
        formData.set('isAjaxRequest','true');
        formData.set('token',token);
        formData.set('_referer',`/campaigns/standards/adgroups/items/detail?tab=bidword&campaignId=${cId}&adGroupId=${aId}`);
        const listUrl = 'https://subway.simba.taobao.com/bidword/tool/adgroup/newscoreSplit.htm';
        const promise = sendURL(listUrl, formData);
        promise.then(data => {
            let total = 0;
            data.result.forEach( d => {
                total += parseInt(d.kwscore);
            })
            document.querySelector('#kwBtn').innerHTML = `
            相关性总分:${total}`
        });
    }

    function showScroe() {
        document.querySelectorAll('[mx-mouseenter^=score]').forEach( node => {
            let score = node.getAttribute('mx-mouseenter')
            let kwscore = S(score).between('kwscore:',',')
            let creative = S(score).between('creativescore:',',')
            let custscore = S(score).between('custscore:',',')
            const newDiv = document.createElement('div')
            newDiv.innerHTML = `
            <br/>
                相关性:${kwscore}
            `
            if(kwscore <= 3) {
                newDiv.setAttribute('style','color:red')
            } else if(kwscore == 4) {
                newDiv.setAttribute('style','color:#f78400')
            } 
            if (node.querySelector('div') === null) {
                node.appendChild(newDiv)
            }
        })
    }

    const wrapperDiv = document.createElement('span');
    wrapperDiv.innerHTML = `
     <span class ="btn btn-brand fl">
        显示相关性
      </span>
    `
    const kwDiv = document.createElement('span');
    kwDiv.innerHTML = `
     <span class ="btn btn-brand fl" id="kwBtn">
        修改相关性
      </span>
    `

    let id = setInterval(() => {

        if (document.querySelector('.standards-adgroups-items-bidword') !== null) {
            clearInterval(id);
            const parent = document.querySelector('.standards-adgroups-items-bidword').querySelector('.fl');
            const oldSpan = parent.querySelector('span[id^=brix_brick]');
            parent.insertBefore(wrapperDiv, oldSpan);
            parent.insertBefore(kwDiv, oldSpan);
            wrapperDiv.addEventListener('click',showScroe);

            if (addUrl.match('https://subway.simba.taobao.com/#!/campaigns/standards/adgroups/items*.') !== undefined) {
                getToken();
            }
        }
    }, 1000);

/*
    setInterval(()=>{
        getToken(false);
    },1000*60);
    */


/* jshint ignore:start */
]]></>).toString();
    var c = Babel.transform(inline_src, { presets: ["es2015", "es2016"] });
    eval(c.code);
/* jshint ignore:end */