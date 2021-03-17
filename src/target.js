import { CURRENT_SITE_INFO, CURRENT_SITE_NAME } from './const';
import { getBDType, getTMDBIdByIMDBId, getIMDBIdByUrl } from './common';

const fillTargetForm = (info) => {
  console.log(info);
  if (CURRENT_SITE_NAME === 'PTSBAO' && localStorage.getItem('autosave')) {
    localStorage.removeItem('autosave');
  }
  const imdbId = getIMDBIdByUrl(info.imdbUrl);
  const isBluray = info.videoType.match(/bluray/i);
  const { screenshots = [] } = info;
  $(CURRENT_SITE_INFO.imdb.selector).val(info.imdbUrl);
  // 针对hdb的站点的命名规则对标题进行处理
  if (CURRENT_SITE_NAME === 'HDBits') {
    let mediaTitle = info.title.replace(/([^\d]+)\s+([12][90]\d{2})/, (match, p1, p2) => {
      return `${info.movieName || info.movieAkaName} ${p2}`;
    });
    if (info.videoType === 'remux') {
      mediaTitle = mediaTitle.replace(/\s+(bluray|blu-ray)/ig, '');
    }
    info.title = mediaTitle;
  }

  // 北洋站不用填写名称
  if (CURRENT_SITE_INFO.name) {
    const { title, subtitle } = info;
    let torrentTitle = title;
    if (CURRENT_SITE_NAME === 'TTG') {
      torrentTitle += `[${subtitle}]`;
    }
    $(CURRENT_SITE_INFO.name.selector).val(torrentTitle);
  }
  // 避免选择种子文件后自动改变种子名称
  disableTorrentChange();

  // 填写四个常见的信息
  const commonInfoKeys = ['subtitle', 'douban', 'area', 'audioCodec'];
  commonInfoKeys.forEach(key => {
    const siteInfo = CURRENT_SITE_INFO[key];
    if (siteInfo && siteInfo.selector) {
      let value = info[key];
      if (key === 'douban') {
        value = info.doubanUrl;
      } else if (key === 'area' || key === 'audioCodec') {
        value = siteInfo.map[info[key]];
      }
      $(siteInfo.selector).val(value);
    }
  });
  const mediaInfo = info.mediaInfo;
  let description = '';
  // 内站直接填写完整简介
  if (info.description) {
    description = info.description;
    if (isChineseTacker(CURRENT_SITE_INFO.siteType) && CURRENT_SITE_NAME !== 'SSD') {
      // 需要拼接豆瓣信息的内站
      const { doubanInfo } = info;
      if (doubanInfo) {
        description = doubanInfo + description;
      }
    } else {
      // 需要过滤掉中文信息
      const { sourceSiteType } = info;
      if (isChineseTacker(sourceSiteType)) {
        description = filterNexusDescription(info);
      }
    }
  }
  // HDB Blu只填入mediainfo bdinfo放在简介里
  if (CURRENT_SITE_INFO.mediaInfo) {
    if (!(isBluray && CURRENT_SITE_NAME.match(/HDBits|Blutopia/))) {
      $(CURRENT_SITE_INFO.mediaInfo.selector).val(mediaInfo);
      description = description.replace(mediaInfo, '').replace(/\[quote\]\[\/quote\]/g, '');
    }
  }
  // 删除简介中的截图
  if (CURRENT_SITE_INFO.screenshots) {
    screenshots.forEach(img => {
      if (description.includes(img)) {
        description = description.replace(img, '');
        if (!img.match(/\[url=.+?\[url]/)) {
          description = description.replace(/\[img\]\[\/img\]\n*/g, '');
        }
      }
    });
  }
  // 给SSD点赞！
  if (CURRENT_SITE_NAME === 'SSD') {
    info.title = info.title.replace(/\s/ig, '.');
    $(CURRENT_SITE_INFO.imdb.selector).val(info.doubanUrl || info.imdbUrl);
    $(CURRENT_SITE_INFO.screenshots.selector).val(screenshots.join('\n'));
    if (info.category === 'tvPack' || info.title.match(/Trilogy|Collection/i) || (info.subTitle && info.subTitle.match(/合集/))) {
      $('input[name="pack"]').attr('checked', true);
    }
  }
  $(CURRENT_SITE_INFO.description.selector).val(getThanksQuote(info) + description.trim());
  // 站点特殊处理
  if (CURRENT_SITE_NAME.match(/BeyondHD|Blutopia/)) {
    const fillIMDBId = CURRENT_SITE_NAME === 'Blutopia' ? imdbId.replace('tt', '') : imdbId;
    $(CURRENT_SITE_INFO.imdb.selector).val(fillIMDBId);
    getTMDBIdByIMDBId(imdbId).then(id => {
      $(CURRENT_SITE_INFO.tmdb.selector).val(id);
    });
    if (CURRENT_SITE_NAME === 'BeyondHD') {
      const { category, videoType } = info;
      // videoType和category交换
      info.category = videoType;
      info.videoType = category;
      // BHD需要细分蓝光类型
      if (isBluray) {
        let bdType = getBDType(info.size);
        if (videoType === 'uhdbluray' && bdType === 'BD50') {
          bdType = 'uhd50';
        }
        info.category = bdType;
      }
    }
  }
  const category = CURRENT_SITE_INFO.category.map[info.category];
  const keyArray = ['videoCodec', 'videoType', 'resolution', 'source', 'area'];
  let finalSelectArray = [];
  if (Array.isArray(category)) {
    finalSelectArray = [...category];
    keyArray.forEach(key => {
      finalSelectArray = matchSelectForm(CURRENT_SITE_INFO, info, key, finalSelectArray);
      if (finalSelectArray.length === 1) {
        $(CURRENT_SITE_INFO.category.selector).val(finalSelectArray[0]);
      }
    });
  } else {
    [...keyArray, 'category'].forEach(key => {
      matchSelectForm(CURRENT_SITE_INFO, info, key, finalSelectArray);
    });
  }
  if (CURRENT_SITE_NAME.match(/HDHome|PTHome/i)) {
    $(CURRENT_SITE_INFO.category.selector).change();
  }
  // 匿名勾选
  if (CURRENT_SITE_INFO.anonymous) {
    const { selector, value = '' } = CURRENT_SITE_INFO.anonymous;
    if (value) {
      $(selector).val(value);
    } else {
      $(selector).attr('checked', true);
    }
  }
  // 标签勾选
  if (CURRENT_SITE_INFO.tags) {
    Object.keys(info.tags).forEach(key => {
      if (info.tags[key] && CURRENT_SITE_INFO.tags[key]) {
        $(CURRENT_SITE_INFO.tags[key]).attr('checked', true);
      }
    });
  }
  // 对配置覆盖不到的地方进行专门处理
  if (CURRENT_SITE_NAME.match(/PTHome|HDSky|LemonHD/i)) {
    if (info.tags.DIY) {
      let categoryValue = '';
      if (CURRENT_SITE_NAME === 'PTHome') {
        categoryValue = info.videoType === 'bluray' ? '14' : '13';
      } else if (CURRENT_SITE_NAME === 'HDSky') {
        categoryValue = info.videoType === 'bluray' ? '12' : '14';
      } else if (CURRENT_SITE_NAME === 'LemonHD') {
        $('select[name="tag_diy"]').val('yes');
        return;
      }
      $(CURRENT_SITE_INFO.videoType.selector).val(categoryValue);
    }
  }
  /*
  * 单独处理HDU
  * 为什么要在媒体类型里再还要增加个TV分类？？
  * */
  if (CURRENT_SITE_NAME.match(/HDU/)) {
    let videoTypeValue = '';
    const { resolution, videoType, category } = info;
    const isTV = category.match(/tv/);
    if (videoType === 'remux') {
      if (resolution === '2160p') {
        videoTypeValue = isTV ? '16' : '15';
      } else {
        videoTypeValue = isTV ? '12' : '3';
      }
    }
    if (isTV) {
      if (videoType === 'encode') {
        videoTypeValue = '14';
      } else if (videoType === 'web') {
        videoTypeValue = '13';
      }
    }
    if (videoTypeValue) {
      $(CURRENT_SITE_INFO.videoType.selector).val(videoTypeValue);
    }
    if (videoType.match(/bluray/)) {
      $(CURRENT_SITE_INFO.category.selector).val('424');
    }
  }
};
/*
* 各个字段之间取交集填入表单
* @param {siteInfo} 当前站点的配置
* @param {key} 要填入的字段key
* @param {movieInfo} 要填入的种子信息
* @param {selectArray} 此时分类对应的值
* @return 取当前key对应的value取交集之后的数组
* */
const matchSelectForm = (siteInfo, movieInfo, key, selectArray) => {
  // 拿到字段所对应的值 可能为字符串或者数组
  const valueArray = siteInfo[key] ? siteInfo[key].map[movieInfo[key]] : undefined;
  if (Array.isArray(valueArray) && selectArray) {
    // 如果当前key下有selector属性 赋值为value第一项
    if (siteInfo[key].selector) {
      $(siteInfo[key].selector).val(valueArray.shift());
    }
    // 如果此时分类对应的值仍未数组 则继续过滤
    if (selectArray.length > 1) {
      selectArray = selectArray.filter(item => valueArray.includes(item));
    }
  } else if (siteInfo[key] && siteInfo[key].selector) {
    $(siteInfo[key].selector).val(valueArray);
  }
  return selectArray;
};

const disableTorrentChange = () => {
  if (CURRENT_SITE_NAME.match(/SSD|HDHome|CHDBits|PTer|PTSBAO|PTHome|BeyondHD|OurBits|HDSky|TCCF/)) {
    $(CURRENT_SITE_INFO.name.selector).attr('id', '');
  }
};
const filterNexusDescription = (info) => {
  const { description, screenshots = [] } = info;
  let filterDescription = '';
  const quoteList = description.match(/\[quote\](.|\n)+?\[\/quote\]/g);
  if (quoteList && quoteList.length > 0) {
    quoteList.forEach(quote => {
      if (!quote.match(/[\u4e00-\u9fa5]+/i)) {
        filterDescription += quote + '\n';
      }
    });
  }
  const screenshotsBBCode = screenshots.map(img => {
    if (img.match(/\[url=.+\]/i)) {
      return img;
    }
    return `[img]${img}[/img]`;
  });
  return filterDescription + '\n' + screenshotsBBCode;
};
const getThanksQuote = (info) => {
  const isChineseSite = isChineseTacker(CURRENT_SITE_INFO.siteType);
  let thanksQuote = `转发自[b]${info.sourceSite}[/b]，感谢原发布者！`;
  if (!isChineseSite) {
    thanksQuote = `Torrent from [b]${info.sourceSite}[/b].\nAll thanks to the original uploader！`;
  }
  return `[quote]${thanksQuote}[/quote]\n\n`;
};
const isChineseTacker = (siteType) => {
  return siteType.match(/NexusPHP|TTG/);
};
export {
  fillTargetForm,
}
;
