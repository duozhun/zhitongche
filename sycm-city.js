// ==UserScript==
// @name         sycm-city 
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  shows how to use babel compiler
// @author       You
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/6.18.2/babel.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/6.16.0/polyfill.js
// @match     https://sycm.taobao.com/mq/portrait/search/*
// @run-at document-body

// ==/UserScript==

/* jshint ignore:start */
var inline_src = (<><![CDATA[
/* jshint ignore:end */
    /* jshint esnext: false */
    /* jshint esversion: 6 */
const token = document.querySelector('meta[name="microdata"]').content.match(new RegExp('legalityToken=([^&]*)'))[1].split(';')[0]
const SYCMURL = 'https://sycm.taobao.com/mq/searchPortrait'
const cateSet = new Map()
const apiArray = [
  ['getRecent90DayPay','近90天支付金额'],
  ['getAge','年龄分布'],
  ['getProvince','省份分布'],
  ['getCity','城市分布']
]

const apiMap = new Map(apiArray);

function getApiKeyFromURL(url) {
  for (let key of apiMap.keys()) {
    if (url.indexOf(key) >= 0) {
      return key
    }
  }
}

function getAgeFromId(id) {
  if(id === '2') return '18-25岁'
  if(id === '3') return '26-30岁'
  if(id === '4') return '31-35岁'
  if(id === '5') return '36-40岁'
  if(id === '6') return '41-50岁'
  if(id === '7') return '51岁以上'
}

function jsonToExcel(content) {
  let resultString = "关键词,一级类目,二级类目,类型,项目,搜索点击人气,搜索点击人群占比\n"
  for(let i in content) {
    const api = getApiKeyFromURL(content[i].url)
    const typeName = apiMap.get(api)
    if (content[i].json !== undefined && content[i].json.content.data.list.length !== 0) {
      const mainData = content[i].json.content.data.list[0].subList
      for (let j in mainData) {
        const key = mainData[j].seKeyword
        if (key !== undefined) {
          const cateL1Name = cateSet.get(key).cateLevel1Name
          const cateName = cateSet.get(key).cateName
          let name = mainData[j].name
          if(api === 'getAge') {
            name = getAgeFromId(name)
          }
          const click = mainData[j].value
          const proportion = mainData[j].proportion
          let newline = `${key},${cateL1Name},${cateName},${typeName},${name},${click},${proportion}\n`
          resultString = resultString + newline;
        }
      }
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
        const result ={}
        result.json = json
        result.url = url
        resolve(result)
      }
    };
  });
}

function getCate(date,keys,type) {
  cateSet.clear()
  const promises = keys.map( (key) => {
    const timestamp = new Date().getTime();
    const keyURI = encodeURI(key)
    return `${SYCMURL}/getCateDistribution.json?dateRange=${date.start}%7C${date.end}&dateType=${type}&device=0&seKeyword=${keyURI}&token=${token}&_${timestamp}`
  }).map( (url) => {
    return sendUrl(url)
  })
  Promise.all(promises).then(data => {
    keys.map((key, index) => {
      if (data[index].json.content.data.list.length !== 0) {
        cateSet.set(key, data[index].json.content.data.list[0].subList[0])
      }
    })
  }).then(() => { getCity(date,keys,type) })
}

function getCity(date, keys,type) {
  const promises = Array.from(apiMap).map(([api,value]) => {
    return keys.filter((key) => {
      return cateSet.get(key) !== undefined
    }).map((key) => {
      const timestamp = new Date().getTime()
      const keyURI = encodeURI(key)
      const catId = cateSet.get(key).cateId
      return `${SYCMURL}/${api}.json?cateId=${catId}&dateRange=${date.start}%7C${date.end}&dateType=${type}&device=0&seKeyword=${keyURI}&token=${token}&_=${timestamp}`
    })
  }).reduce( (result,value) => {
    return Array.concat(result,value)
  }).map((url) => {
    return sendUrl(url)
  })

  Promise.all(promises).then((data) => {
    download(jsonToExcel(data), `${date.start}~${date.end}-搜索人群画像.csv`, 'json')
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


let id = setInterval(() => {
  let keywordSelector = document.querySelector('.keyword-selector ');
  if (keywordSelector != undefined) {
    clearInterval(id);
    keywordSelector.appendChild(wrapperDiv)
    document.querySelector('#dz-btn').onclick = () => {
      let keys = document.querySelector('#dz-keys').value.replace(new RegExp('，', 'g'), ',').split(',')
      let typeStr = document.querySelector('.dtpicker-main-text').innerText
      let type = typeMap[typeStr.substring(0, typeStr.indexOf('（'))]
      let dateArr = document.querySelector('.dtpicker-main-text .num').innerText.split('~');
      let date = {}
      let re = new RegExp('20[0-9]{2}\-[0-9]{1,2}\-[0-9]{1,2}')
      date.start = dateArr[0].match(re)[0];
      date.end = dateArr[1].match(re)[0];
      getCate(date, keys, type)
    }
  }
}
);

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

