// ==UserScript==
// @name         sycm-city 
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  shows how to use babel compiler
// @author       You
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/6.18.2/babel.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/6.16.0/polyfill.js
// @match     https://sycm.taobao.com/mq/portrait/search/*

// ==/UserScript==

/* jshint ignore:start */
var inline_src = (<><![CDATA[
/* jshint ignore:end */
    /* jshint esnext: false */
    /* jshint esversion: 6 */
const token = document.querySelector('meta[name="microdata"]').content.match(new RegExp('legalityToken=([^&]*)'))[1].split(';')[0]
const SYCMURL = 'https://sycm.taobao.com/mq/searchPortrait/'
const catSet = new Map()
let dataList = {}

function jsonToExcel(content) {
  let resultString = "关键词,城市名,搜索点击人气,搜索点击人群占比\n"
  for(let key in content) {
    const mainKey = content[key].key
    const mainData = content[key].value.content.data.list[0].subList
    for(let value in mainData){
      const city = mainData[value].name
      const click = mainData[value].value 
      const proportion = mainData[value].proportion
      let newline = `${mainKey},${city},${click},${proportion}\n`
      resultString = resultString + newline
    }
  }
  return resultString
}

function sendUrl(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url)
    xhr.send()
    xhr.onreadystatechange = ev => {
      if (xhr.readyState === 4 && xhr.status === 200) {
        const json = JSON.parse(xhr.response)
        resolve(json)
      }
    };
  });
}

function getCate(date,keys,type) {
  catSet.clear()
  const promises = keys.map( (key) => {
    const timestamp = new Date().getTime();
    const keyURI = encodeURI(key)
    return `${SYCMURL}getCateDistribution.json?dateRange=${date.start}%7C${date.end}&dateType=${type}&device=0&seKeyword=${keyURI}&token=${token}&_${timestamp}`
  }).map( (url) => {
    return sendUrl(url)
  })
  Promise.all(promises).then(data => {
    keys.map((key, index) => {
      catSet.set(key,data[index].content.data.list[0].subList[0].cateId)
    })
  }).then(() => { getCity(date,keys,type) });
}

function getCity(date, keys,type) {
  dataList = {}
  const promises = keys.map((key) => {
    const timestamp = new Date().getTime();
    const keyURI = encodeURI(key)
    const catId = catSet.get(key)
    return `${SYCMURL}/getCity.json?cateId=${catId}&dateRange=${date.start}%7C${date.end}&dateType=${type}&device=0&seKeyword=${keyURI}&token=${token}&_=${timestamp}`
  }).map((url) => {
    return sendUrl(url)
  })

  Promise.all(promises).then(data => {
    keys.map((key, index) => {
      dataList[index] = {}
      dataList[index].key = key
      dataList[index].value = data[index]
    });
  }).then(() => {
    download(jsonToExcel(dataList), `${date.start}~${date.end}-城市排名.csv`, 'json')
  })
}

const wrapperDiv = document.createElement('div');
wrapperDiv.innerHTML = `
<div class="keyword-picker">
    <div class="keyword-input">
      <div class="main-search-container">
        <div class="main-search-input-component">
          <div class="main-search-input-wrapper">
            <input type="input" class="main-search-input" value="" id="dz-keys">
            <span class="main-search-del" style="display: none;">×</span>
              <i class="main-search-icon">
                <i class="icon-search"></i>
              </i>
          </div>
          <div class="main-search-btn-wrapper">
            <a class="btn btn-blank main-search-btn" id="dz-btn">确定</a>
          </div>
        </div>
      </div>
    </div>
    </div>
    `
  
const typeMap = {'最近1天':'recent1','最近7天':'recent7','最近30天':'recent30','自然日':'day','自然周':'week','自定义':'range'};

let keywordSelector = document.querySelector('.keyword-selector ')
if (keywordSelector != undefined) {
  keywordSelector.appendChild(wrapperDiv)
  document.querySelector('#dz-btn').onclick = () => {
    let keys = document.querySelector('#dz-keys').value.replace(new RegExp('，','g'),',').split(',')
    let typeStr = document.querySelector('.dtpicker-main-text').innerText
    let type =  typeMap[typeStr.substring(0,typeStr.indexOf('（'))]
    let dateArr = document.querySelector('.dtpicker-main-text .num').innerText.split('~');
    let date = {}
    let re = new RegExp('20[0-9]{2}\-[0-9]{1,2}\-[0-9]{1,2}')
    date.start = dateArr[0].match(re)[0];
    date.end = dateArr[1].match(re)[0];
    getCate(date, keys, type)
  }
}

function download(data, filename, type) {
  var file = new Blob([data], { type: type });
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

