import { CURRENT_SITE_NAME, TORRENT_INFO } from '../const';
import { formatTorrentTitle, getSize, getInfoFromBDInfo, getInfoFromMediaInfo, getSourceFromTitle } from '../common';
import { getVideoType, getCategory } from './helper';

export default async () => {
  const title = formatTorrentTitle(document.title.match(/"(.+)"/)?.[1] || '');
  const subTitle = $("div.font-bold.leading-6:contains('副标题')").next().text().replace(/：/g, ':');
  const imbdDom = $('#kimdb a[href*="imdb.com/title"]');
  const siteImdbUrl = imbdDom?.attr('href') ?? '';
  const movieName = imbdDom?.text()?.replace(/\n|\s/g, '') ?? '';
  const metaInfo = getMetaInfo();
  const isBluray = !!metaInfo.videoType?.match(/bluray/i);
  const mediaInfo = $('#mediainfo-raw code').text() || '';
  const specs = getSpecsFromMediainfo(isBluray, mediaInfo);
  if (Object.keys(specs).length > 0) {
    Object.assign(metaInfo, specs);
  }
  const { category, videoType, videoCodec, audioCodec, resolution, size } = metaInfo;

  const formatSize = getSize(size);
  const year = title?.match(/(19|20)\d{2}/g) ?? [];

  const screenshots = $('#screenshot-content img')
    .toArray().map((el) => $(el).attr('src')).filter(url => url && url !== '') as string[];

  const doubanUrl = $('#douban_info-content').prev().find('a[href*="douban.com"]').attr('href') ?? '';
  let description = `
    [quote]${mediaInfo}[/quote]
  `;
  screenshots.forEach((url) => {
    description += `[img]${url}[/img]`;
  });
  const tags = getTagsFromPage();

  Object.assign(TORRENT_INFO, {
    title,
    subtitle: subTitle,
    imdbUrl: siteImdbUrl,
    description,
    year: year.length > 0 ? year.pop() as string : '',
    source: getSourceFromTitle(title),
    mediaInfo,
    screenshots,
    movieName,
    sourceSite: CURRENT_SITE_NAME,
    sourceSiteType: TORRENT_INFO.sourceSiteType,
    category: getCategory(category),
    size: formatSize,
    tags: { ...specs.mediaTags, ...tags },
    videoType: getVideoType(videoType),
    videoCodec,
    audioCodec,
    resolution,
    doubanUrl,
    poster: $('#cover-content')?.attr('src') ?? '',
  });
};

const getMetaInfo = () => {
  const meta = getMetaValue();
  const category = meta['类型'];
  const videoType = meta['来源'];
  const videoCodec = meta['编码'];
  const audioCodec = meta['音频编码'];
  const resolution = meta['分辨率'];
  const processing = meta['处理'];
  const size = meta['大小'];
  console.log({
    category,
    videoType,
    videoCodec,
    audioCodec,
    resolution,
    size,
  });
  return {
    category,
    videoType,
    videoCodec,
    audioCodec,
    resolution,
    processing,
    size,
  };
};
const getMetaValue = () => {
  const result = {} as {[key:string]:string};
  $("div.font-bold.leading-6:contains('基本信息')").next().find('div span').each((index, el) => {
    if (index % 2 === 0) {
      const key = $(el).text().replace(/:|：/g, '').trim();
      result[key] = $(el).next().text();
    }
  });
  return result;
};

function getSpecsFromMediainfo (isBluray:boolean, mediaInfo:string) {
  const getInfoFunc = isBluray ? getInfoFromBDInfo : getInfoFromMediaInfo;
  const { videoCodec, audioCodec, resolution, mediaTags } = getInfoFunc(mediaInfo);
  if (videoCodec !== '' && audioCodec !== '' && resolution !== '') {
    return {
      videoCodec,
      audioCodec,
      resolution,
      mediaTags,
    };
  }
  return {};
}

const getTagsFromPage = () => {
  const tags:TorrentInfo.MediaTags = {};
  const tagText = $("div.font-bold.leading-6:contains('标签')").next().text();
  if (tagText.includes('中字')) {
    tags.chinese_subtitle = true;
  }
  if (tagText.includes('国语')) {
    tags.chinese_audio = true;
  }
  if (tagText.includes('粤语')) {
    tags.cantonese_audio = true;
  }
  if (tagText.includes('DIY')) {
    tags.diy = true;
  }
  if (tagText.includes('杜比视界')) {
    tags.dolbyVision = true;
  }
  if (tagText.includes('HDR')) {
    tags.dolbyVision = true;
  }
  return tags;
};
