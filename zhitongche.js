// ==UserScript==
// @name         zhitongche 
// @namespace    http://tampermonkey.net/
// @version      0.2.3
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


    function sendURL(url,formData,debug=false) {
        return new Promise( (resolve , reject ) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url);
            xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded; charset=UTF-8');
            xhr.setRequestHeader('accept','application/json, text/javascript, */*; q=0.01')
            let urlEncodedData = "";
            // 将对象类型的数据转换成URL字符串
            for (let name of formData.keys()) {
                urlEncodedData += encodeURIComponent(name) + "=" + encodeURIComponent(formData.get(name)) + "&";
            }
            // 删除掉最后的"&"字符
            urlEncodedData = urlEncodedData.slice(0, -1);
            // xhr.setRequestHeader('x-requested-with','XMLHttpRequest')
            xhr.send(urlEncodedData);
            xhr.onreadystatechange = ev => {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    const json = JSON.parse(xhr.response);
                    if (debug) {
                        console.log('result:::' + JSON.stringify(json));
                    }
                    resolve(json);
                }
            };
        });
    }

    function getToken(only=false) {
        let formData = new FormData();
        formData.append('_referer', '/home');
        const userUrl = 'https://subway.simba.taobao.com/bpenv/getLoginUserInfo.htm';
        const promise = sendURL(userUrl, formData);
        let addUrl = document.URL;
        let campaignId = S(addUrl.match(new RegExp('campaignId=[0-9]+'))).between('campaignId=');
        let adGroupId = S(addUrl.match(new RegExp('adGroupId=[0-9]+'))).between('adGroupId=');
        return promise.then(data => {
            token = data.result.token;
        }).then(() => {
            if (only === false) {
                return getBasicInfo(campaignId,adGroupId);
            }
        }).then(()=>{
            if (only === false) {
                return getWordList(campaignId, adGroupId);
            }
        });
    }
    let itemId = '';
    let itemTitle = '';

    function getBasicInfo(cId,aId) {
        let formData = new FormData();
        formData.set('sla','json');
        formData.set('isAjaxRequest','true');
        formData.set('token',token);
        formData.set('_referer',`/campaigns/standards/adgroups/items/detail?tab=bidword&campaignId=${cId}&adGroupId=${aId}`);
        const listUrl = `https://subway.simba.taobao.com/adgroup/get.htm?adGroupId=${aId}`;
        const promise = sendURL(listUrl, formData);
        return promise.then(data => {
            itemId = data.result.outsideItemNumId;
            itemTitle = data.result.title;
        })
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
        let wordId = [];
        return promise.then(data => {
            for (let r in data.result) {
                wordId.push(data.result[r].keywordId);
            }
        }).then(() => {
            return getScore(cId, aId, wordId);
        });
    }

    
            
    let keywordBody = {}
    let lastBody = undefined;
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
        return promise.then(data => {
            let total = 0;
            let keywords = [];
            let scores = [];
            data.result.forEach( d => {
                total += parseInt(d.kwscore);
                scores.push(d.kwscore);
                keywords.push(d.word);
            })
            console.log(`总分为${total}`)
            document.querySelector('#kwBtn').innerHTML = `
            修改相关性(总分):${total}`
            keywordBody.keyword = keywords ;
            keywordBody.score = scores;
            return getCreative(cId,aId);
        });
    }

    let creativeSet = [];
    function getCreative(cId,aId) {
        let formData = new FormData();
        formData.set('sla','json');
        formData.set('isAjaxRequest','true');
        formData.set('token',token);
        formData.set('_referer',`/campaigns/standards/adgroups/items/detail?tab=creative&campaignId=${cId}&adGroupId=${aId}`);
        const listUrl = `https://subway.simba.taobao.com/creative/list.htm?adGroupId=${aId}`;
        const promise = sendURL(listUrl, formData);
        return promise.then(data => {
            creativeSet = data.result;
        });
    }



    let titleList = undefined; 

    function getTitle() {
        lastBody = keywordBody;
        console.log('record lastBody')
        document.querySelector('#kwBtn').innerHTML = `
            标题修改中...`;
        let formData = new FormData();
        formData.append('keywords', JSON.stringify(keywordBody));
        formData.append('titleNum', creativeSet.length)
        const listUrl = 'https://service.duozhun.cc/algo/titleOpt';
        const promise = sendURL(listUrl, formData);
        promise.then(data => {
            let requestList = [];
            titleList = data.data.list;
            for(let i in creativeSet) {
                let req = {};
                let creative = creativeSet[i];
                req.campaignId = creative.campaignId;
                req.adGroupId = creative.adGroupId;
                req.creativeId = creative.creativeId;
                req.elementTId = creative.elementTId;
                // req.qualityflag = creative.qualityflag;
                req.qualityflag = 0;
                req.templateData = creative.templateData;
                req.creativeCenterTemplateId = creative.creativeCenterTemplateId;
                req.sailingType = creative.sailingType;
                req.creativeAdvancedSettingDTO = {};
                req.creativeAdvancedSettingDTO.channel = creative.creativeAdvancedSettingDTO.channel;
                req.creativeElementList = new Array();
                for(let j in creative.creativeElementList) {
                    let el = {};
                    let e = creative.creativeElementList[j];
                    el.cname = e.cname;
                    if(e.cname === 'TITLE') {
                        el.cvalue = titleList[i];
                    } else if(e.cname === 'IMGURL' || e.cname === 'LINKURL') {
                        el.cvalue = e.cvalue;
                    } else {
                        el.cvalue = '';
                    }
                    req.creativeElementList.push(el);
                } 
                requestList.push(req);
            }
            const promises = requestList.map( (req) => {
                return setCreativeTitle(req);
            });
            Promise.all(promises).then(()=>{
                return new Promise((resolve) => {
                    setTimeout(resolve,3000);
                })
            }).then(() => {
                return getToken()
            }).then(()=>{
                report();
            });
        });
    }

    function report() {
        console.log(lastBody);
        console.log(keywordBody);
        console.log(itemId);
        console.log(itemTitle);
        console.log(titleList);
        let titles = {};
        titles.title = titleList;
        let formData = new FormData();
        formData.append('itemId', itemId);
        formData.append('itemTitle', itemTitle);
        formData.append('keywords', JSON.stringify(lastBody));
        formData.append('keywordsAfter', JSON.stringify(keywordBody));
        formData.append('optTitles', JSON.stringify(titles))
        const listUrl = 'https://service.duozhun.cc/algo/titleOptLog';
        const promise = sendURL(listUrl, formData);
        promise.then(()=>{

        });
    }

    function setCreativeTitle(req) {
        let formData = new FormData();
        formData.append('creative', JSON.stringify(req));
        formData.append('sla','json');
        formData.append('isAjaxRequest','true');
        formData.append('token',token);
        formData.append('_referer',`/campaigns/standards/adgroups/items/creative/edit?creativeId=${req.creativeId}&adGroupId=${req.adGroupId}&campaignId=${req.campaignId}`);
        const listUrl = `https://subway.simba.taobao.com/creative/updateCreative.htm`;
        return sendURL(listUrl, formData);
    }

    function showScore() {
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

        if (document.querySelector('.standards-adgroups-items-bidword') !== null
            && document.URL.match('https://subway.simba.taobao.com/#!/campaigns/standards/adgroups/items/detail?tab=bidword*') !== undefined) {
            // clearInterval(id);
            if (document.querySelector('#kwBtn') === null) {
                const parent = document.querySelector('.standards-adgroups-items-bidword').querySelector('.fl');
                const oldSpan = parent.querySelector('span[id^=brix_brick]');
                parent.insertBefore(wrapperDiv, oldSpan);
                parent.insertBefore(kwDiv, oldSpan);
                wrapperDiv.addEventListener('click', showScore);
                kwDiv.addEventListener('click', getTitle);
                getToken();
                document.querySelector('[mx-click$="{tab:bidword}"]').addEventListener('click', main);
            } else {
                // getToken(true);
            }
        }
    }, 1000);



/* jshint ignore:start */
]]></>).toString();
    var c = Babel.transform(inline_src, { presets: ["es2015", "es2016"] });
    eval(c.code);
/* jshint ignore:end */