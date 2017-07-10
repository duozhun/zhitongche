// ==UserScript==
// @name         zhitongche 
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  shows how to use babel compiler
// @author       You
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/6.18.2/babel.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/6.16.0/polyfill.js
// @match        https://subway.simba.taobao.com/*
// ==/UserScript==

/* jshint ignore:start */
var inline_src = (<><![CDATA[
/* jshint ignore:end */
    /* jshint esnext: false */
    /* jshint esversion: 6 */

    function sendURL(url,formData) {
        return new Promise( (resolve , reject ) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url);
            xhr.send(formData);
            xhr.onreadystatechange = ev => {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    const json = JSON.parse(xhr.response);
                    resolve(json);
                }
            };
        });
    }
    
    if (document.URL.match('https://subway.simba.taobao.com/#!/campaigns/standards/adgroups/items*.') !== undefined) {
    let formData = new FormData();
    formData.append('_referer', '/home');
    const userUrl = 'https://subway.simba.taobao.com/bpenv/getLoginUserInfo.htm';
    const promise = sendURL(userUrl, formData);
    let token;
    promise.then(data => {
        token = data.result.token;
        console.log(token);
    });
}


/* jshint ignore:start */
]]></>).toString();
var c = Babel.transform(inline_src, { presets: [ "es2015", "es2016" ] });
eval(c.code);
/* jshint ignore:end */