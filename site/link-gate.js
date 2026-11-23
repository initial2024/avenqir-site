"use strict";
/* Curated destination provenance. This is NOT antivirus scanning or safety certification.
   Exact original HTTPS addresses only; a different path/query/domain never inherits trust.
   Never accept security decisions from user-generated labels or admin data fields. */
(function(root){
  const OFFICIAL_URLS = [
    'https://github.com/',
    'https://developer.mozilla.org/zh-CN/',
    'https://caniuse.com/',
    'https://www.gutenberg.org/',
    'https://www.openstreetmap.org/',
    'https://commons.wikimedia.org/',
    'https://www.khanacademy.org/',
    'https://ocw.mit.edu/',
    'https://scholar.google.com/',
    'https://arxiv.org/',
    'https://images.nasa.gov/',
    'https://webbook.nist.gov/chemistry/',
    'https://radar.cloudflare.com/',
    'https://www.geogebra.org/',
    'https://phet.colorado.edu/',
    'https://www.desmos.com/calculator',
    'https://zbib.org/',
    'https://search.crossref.org/',
    'https://ourworldindata.org/',
    'https://science.nasa.gov/eyes/',
    'https://www.nasa.gov/interactives/',
    'https://stellarium-web.org/',
    'https://gchq.github.io/CyberChef/',
    'https://wave.webaim.org/',
    'https://internet.nl/',
    'https://safebrowsing.google.com/',
    'https://pagespeed.web.dev/',
    'https://web.dev/',
    'https://pubmed.ncbi.nlm.nih.gov/',
    'https://www.wikidata.org/',
    'https://fonts.google.com/',
    'https://www.blender.org/',
    'https://www.gimp.org/',
    'https://inkscape.org/',
    'https://openverse.org/'
  ];
  function sanitize(raw){
    if(typeof raw!=='string'||raw.length>1800)return null;
    try{
      const url = new URL(raw);
      if(!['https:','http:'].includes(url.protocol)||!url.hostname||url.username||url.password||url.hash)return null;
      return url;
    }catch{return null;}
  }
  const verified = new Set(OFFICIAL_URLS.map(x=>new URL(x).href));
  function officialSourceReviewed(raw){
    const url=sanitize(raw);
    return !!url&&url.protocol==='https:'&&verified.has(url.href);
  }
  function searchEngineDestination(engine,query){
    const value=String(query??'').trim().slice(0,300);
    const bases={
      google:'https://www.google.com/search?q=',
      bing:'https://www.bing.com/search?q=',
      duck:'https://duckduckgo.com/?q='
    };
    if(!Object.prototype.hasOwnProperty.call(bases,engine))return null;
    if(!value){
      return {google:'https://www.google.com/',bing:'https://www.bing.com/',duck:'https://duckduckgo.com/'}[engine];
    }
    return bases[engine]+encodeURIComponent(value);
  }
  const api=Object.freeze({sanitize,officialSourceReviewed,searchEngineDestination,OFFICIAL_URLS:Object.freeze(OFFICIAL_URLS.slice())});
  root.AVENQIR_LINK_GATE=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
