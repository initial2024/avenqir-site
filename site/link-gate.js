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
    'https://jupyter.org/try',
    'https://zenodo.org/',
    'https://squoosh.app/',
    'https://lookup.icann.org/',
    'https://www.iana.org/',
    'https://www.rfc-editor.org/',
    'https://www.w3.org/',
    'https://dns.google/',
    'https://obsproject.com/',
    'https://www.libreoffice.org/',
    'https://standardebooks.org/',
    'https://creativecommons.org/',
    'https://docs.github.com/',
    'https://owasp.org/',
    'https://openverse.org/',
    // Source-domain checks on 2026-11-23; this does NOT establish website safety.
    'https://www.who.int/',
    'https://www.cdc.gov/',
    'https://pubchem.ncbi.nlm.nih.gov/',
    'https://www.icann.org/',
    'https://www.ietf.org/standards/',
    'https://www.gov.uk/',
    'https://www.wto.org/',
    // Official-source search results checked 2026-11-24; not malware verdicts.
    'https://developer.android.com/identity/sign-in/credential-manager-faq',
    'https://developer.android.com/identity/sign-in/credential-provider',
    'https://developer.android.com/identity/sign-in/restore-credentials-implementation',
    'https://docs.python.org/3/',
    'https://docs.python.org/3/tutorial/',
    'https://docs.python.org/3/howto/',
    'https://docs.python.org/3/faq/general.html',
    'https://csrc.nist.gov/Publications',
    'https://datatracker.ietf.org/',
    'https://www.ietf.org/process/publication/',
    'https://support.datacite.org/docs/datacite-commons',
    'https://openlearning.mit.edu/courses-programs/mit-opencourseware',
    'https://www.unesco.org/en/scamalert',
    // 2026-11-24 exact source listing; not a security certification.
    'https://www.activehealth.sg/',
    'https://www.artweek.sg/',
    'https://www.aseanip.org/',
    'https://www.familiesforlife.sg/',
    'https://www.forwardsingapore.gov.sg/',
    'https://fulcrum.sg/',
    'https://www.healthhub.sg/',
    'https://www.bilingualism.sg/',
    'https://www.activesgcircle.gov.sg/',
    'https://www.nlb.gov.sg/main/nlonline',
    'https://www.parking.sg/',
    'https://www.scamshield.gov.sg/',
    'https://www.sentosa.com.sg/',
    'https://www.digitalgateway.sg/',
    'https://www.singaporeopportunityindex.sg/',
    'https://www.sysnmh.org.sg/',
    'https://sleb.sg/',
    'https://tradetrust.io/',
    'https://www.tal.sg/',
    'https://www.visitsingapore.com/',
    'https://www.aic.sg/',
    'https://www.ah.com.sg/',
    'https://aseangeospatial.org/',
    'https://asmc.asean.org/',
    'https://www.aas.com.sg/',
    'https://www.chas.sg/',
    'https://www.giving.sg/',
    'https://www.globalfinancialgovernance.org/',
    'https://www.healthcarescholarships.sg/',
    'https://www.imh.com.sg/',
    'https://www.ipi-singapore.org/',
    'https://www.jch.com.sg/',
    'https://www.ktph.com.sg/',
    'https://www.kkh.com.sg/',
    'https://www.mlc.sg/',
    'https://www.mohh.com.sg/',
    'https://www.moht.com.sg/',
    'https://www.nccs.com.sg/',
    'https://www.ncpc.org.sg/',
    'https://www.ndcs.com.sg/',
    'https://www.nfec.org.sg/',
    'https://corp.nhg.com.sg/',
    'https://www.nhgp.com.sg/',
    'https://www.nhcs.com.sg/',
    'https://www.nni.com.sg/',
    'https://www.nsc.com.sg/',
    'https://www.ncis.com.sg/',
    'https://www.nucohs.com.sg/',
    'https://www.nuhs.edu.sg/',
    'https://www.nuh.com.sg/',
    'https://www.nup.com.sg/',
    'https://www.ntfgh.com.sg/',
    'https://www.publichygienecouncil.sg/',
    'https://www.skh.com.sg/',
    'https://www.sgenable.sg/',
    'https://www.sgh.com.sg/',
    'https://www.snec.com.sg/',
    'https://srsc.org.sg/',
    'https://www.sgwomenintech.sg/',
    'https://www.singhealth.com.sg/',
    'https://www.synapxe.sg/',
    'https://www.ttsh.com.sg/',
    'https://taxacademy.sg/',
    'https://trustplatform.sg/',
    'https://www.yishuncommunityhospital.com.sg/',
    'https://www.asiatechxsg.com/',
    'https://www.siww.com.sg/',
    'https://switchsg.org/',
    'https://www.singaporewritersfestival.com/',
    'https://www.worldcitiessummit.com.sg/',
    'https://www.usa.gov/agency-index',
    'https://www.gov.uk/government/organisations',
    'https://www.w3.org/standards/',
    'https://www.w3.org/TR/WCAG21/',
    'https://docs.python.org/3/reference/',
    'https://docs.python.org/3/library/',
    'https://www.gov.sg/trusted-sites/',
    'https://www.sgdi.gov.sg/Ministries',
    'https://www.sgdi.gov.sg/statutory-boards',
    'https://data.gov.sg/agencies',
    'https://packaging.python.org/',
    'https://peps.python.org/',
    'https://devguide.python.org/',
    'https://typing.python.org/',
    // Exact official-source review 2026-11-24; not a safety certificate.
    'https://jarvis.nist.gov/',
    'https://cccbdb.nist.gov/',
    'https://validator.w3.org/',
    'https://www.w3.org/TR/',
    'https://www.iana.org/domains',
    'https://www.iana.org/protocols',
    'https://www.nist.gov/cyberframework',
    'https://dlmf.nist.gov/',
    'https://nvd.nist.gov/',
    'https://www.ncsc.gov.uk/',
    'https://www.enisa.europa.eu/',
    'https://cert.europa.eu/',
    'https://www.earthdata.nasa.gov/',
    'https://apod.nasa.gov/apod/',
    'https://exoplanetarchive.ipac.caltech.edu/',
    'https://www.ncei.noaa.gov/',
    'https://data.un.org/',
    'https://oyc.yale.edu/',
    'https://plato.stanford.edu/',
    'https://www.nist.gov/',
    'https://www.nist.gov/srd',
    'https://www.weather.gov/',
    'https://www.usgs.gov/',
    'https://earthexplorer.usgs.gov/',
    'https://www.ncbi.nlm.nih.gov/',
    'https://medlineplus.gov/',
    'https://www.fda.gov/',
    'https://www.archives.gov/',
    'https://www.ietf.org/',
    'https://data.europa.eu/',
    'https://ec.europa.eu/eurostat',
    'https://eur-lex.europa.eu/',
    'https://www.federalreserve.gov/',
    'https://www.investor.gov/',
    'https://www.usa.gov/',
    'https://www.noaa.gov/',
    // Exact-source evidence review 2026-11-24; not malware certification.
    'https://docs.materialsproject.org/',
    'https://www.materialscloud.org/',
    'https://doaj.org/',
    'https://www.debian.org/doc/',
    'https://llvm.org/docs/',
    'https://go.dev/doc/',
    'https://www.postgresql.org/docs/',
    'https://www.sqlite.org/docs.html',
    'https://docs.kernel.org/',
    'https://www.rcsb.org/',
    'https://jigsaw.w3.org/css-validator/',
    'https://cheatsheetseries.owasp.org/',
    'https://docs.freebsd.org/en/books/handbook/',
    'https://cmake.org/documentation/',
    'https://maven.apache.org/guides/',
    'https://opendata.cern.ch/',
    'https://www.nims.go.jp/eng/',
    'https://www.crossref.org/documentation/',
    'https://developer.mozilla.org/en-US/docs/Web/API',
    'https://developer.mozilla.org/en-US/docs/Web/CSS',
    'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    'https://openstax.org/subjects',
    'https://nodejs.org/en',
    'https://www.typescriptlang.org/docs/',
    'https://go.dev/',
    'https://developer.android.com/',
    'https://react.dev/',
    'https://vuejs.org/',
    'https://svelte.dev/',
    'https://pypi.org/',
    'https://www.loc.gov/',
    'https://www.aps.org/',
    'https://www.iop.org/',
    'https://pdg.lbl.gov/',
    'https://www.nist.gov/pml',
    'https://www.aip.org/',
    'https://www.eso.org/public/',
    'https://www.uniprot.org/',
    'https://www.ebi.ac.uk/',
    'https://www.acs.org/',
    'https://www.ebi.ac.uk/chembl/',
    'https://www.e-stat.go.jp/',
    'https://cir.nii.ac.jp/',
    'https://www.jstage.jst.go.jp/',
    'https://www.jma.go.jp/jma/index.html',
    'https://www.jst.go.jp/',
    'https://www.stats.gov.cn/',
    'https://www.cas.cn/',
    'https://www.gov.sg/',
    'https://www.singstat.gov.sg/',
    'https://www.cwa.gov.tw/',
    'https://www.stat.gov.tw/',
    'https://www.hkpl.gov.hk/',
    'https://www.gov.mo/en/',
    'https://www.govt.nz/',
    'https://www.apnic.net/',
    'https://www.audacityteam.org/',
    'https://commonmark.org/',
    'https://developer.chrome.com/docs/lighthouse/',
    'https://typst.app/',
    'https://www.torproject.org/',
    'https://wiki.openstreetmap.org/',
    'https://www.nomoreransom.org/',
    'https://github.com/advisories',
    'https://explore.openaire.eu/',
    'https://speed.cloudflare.com/',
    'https://huggingface.co/models',
    'https://ollama.com/',
    'https://lmstudio.ai/',
    'https://computerhistory.org/',
    'https://www.w3.org/History.html',
    'https://chem.libretexts.org/',
    'https://gnupg.org/',
    'https://f-droid.org/',
    'https://stellarium.org/',
    'https://openlibrary.org/',
    'https://www.ssllabs.com/ssltest/',
    'https://laws.e-gov.go.jp/',
    'https://data.e-gov.go.jp/info/ja',
    'https://www.iau.org/',
    'https://www.wolframalpha.com/',
    'https://www.geogebra.org/graphing',
    'https://rust-lang.org/',
    'https://stackoverflow.com/questions',
    'https://molview.org/',
    'https://physics.info/',
    'https://www.heavens-above.com/',
    'https://openai.com/',
    'https://www.anthropic.com/',
    'https://deepmind.google/',
    'https://x.ai/',
    'https://mistral.ai/',
    'https://www.deepseek.com/',
    'https://cohere.com/',
    'https://www.ai21.com/',
    'https://stability.ai/',
    'https://huggingface.co/',
    'https://www.pewresearch.org/topic/internet-technology/',
    'https://qwen.ai/',
    'https://www.ncl.edu.tw/',
    'https://www.ctt.gov.mo/',
    'https://www.nzpost.co.nz/',
    'https://www.poste.it/',
    'https://www.jreast.co.jp/',
    'https://www.post.japanpost.jp/',
    'https://www.usps.com/',
    'https://www.oneservice.gov.sg/',
    'https://www.singpost.com/',
    'https://www.smrt.com.sg/',
    'https://data.gov.hk/en/',
    'https://www.dsec.gov.mo/zh-MO/',
    'https://www.macaotourism.gov.mo/en/',
    'https://www.dsat.gov.mo/dsat/index.aspx',
    'https://www.post.gov.tw/post/internet/Group/default.jsp',
    'https://www.railway.gov.tw/tra-tip-web/tip',
    'https://www.airnewzealand.com/en-nz',
    'https://www.trenitalia.com/it.html',
    'https://chocolatey.org/',
    'https://ninite.com/',
    'https://www.mathsisfun.com/',
    'https://www.rapidtables.com/',
    'https://www.chemguide.co.uk/',
    'https://apnews.com/',
    'https://www.reuters.com/',
    'https://arstechnica.com/',
    'https://www.theverge.com/',
    'https://www.wired.com/',
    'https://techcrunch.com/',
    'https://www.theregister.com/',
    'https://www.engadget.com/',
    'https://spectrum.ieee.org/',
    'https://hackaday.com/',
    'https://alternativeto.net/',
    'https://dribbble.com/',
    'https://flathub.org/en',
    'https://www.rakuten.co.jp/',
    'https://www.gov.tw/',
    'https://www.yahoo.co.jp/',
    'https://www.fairprice.com.sg/',
    'https://www.target.com/',
    'https://www.macau-airport.com/',
    'https://www.thewarehouse.co.nz/',
    'https://data.gov.tw/',
    'https://www.grab.com/sg/',
    'https://www.octopus.com.hk/tc/consumer/index.html',
    'https://pixabay.com/',
    'https://www.photopea.com/',
    'https://browserleaks.com/',
    'https://dnschecker.org/',
    'https://time.is/',
    'https://haveibeenpwned.com/',
    'https://www.chess.com/',
    'https://www.ripe.net/',
    'https://iupac.org/',
    'https://www.jigsawplanet.com/',
    'https://skribbl.io/',
    'https://www.coolmathgames.com/',
    'https://www.unitconverters.net/',
    'https://www.convertunits.com/',
    'https://www.worldtimebuddy.com/',
    'https://ticktick.com/',
    'https://www.ilovepdf.com/',
    'https://smallpdf.com/',
    'https://www.gbif.org/',
    'https://www.deepl.com/en/translator',
    'https://www.todoist.com/',
    'https://tools.pdf24.org/en/',
    'https://docs.docker.com/',
    'https://developers.cloudflare.com/',
    'https://huggingface.co/datasets',
    'https://huggingface.co/spaces',
    'https://ai.google.dev/',
    'https://pytorch.org/',
    'https://www.tensorflow.org/',
    'https://scikit-learn.org/stable/',
    'https://onnx.ai/',
    'https://oqmd.org/',
    'https://aflow.org/',
    'https://www.optimade.org/',
    'https://pymatgen.org/',
    'https://www.si.edu/openaccess',
    'https://www.europeana.eu/en',
    'https://iep.utm.edu/',
    'https://www.open.edu/openlearn/',
    'https://www.edx.org/',
    'https://pll.harvard.edu/',
    'https://ed.ted.com/',
    'https://www.merriam-webster.com/',
    'https://reference.wolfram.com/language/',
    'https://data.gov/',
    'https://fred.stlouisfed.org/',
    'https://www.inaturalist.org/',
    'https://www.itis.gov/',
    'https://www.bgs.ac.uk/',
    'https://www.earthscope.org/',
    'https://geology.com/',
    'https://volcano.si.edu/',
    'https://climate.copernicus.eu/',
    'https://www.carbonbrief.org/',
    'https://www.unep.org/',
    'https://www.globalcarbonproject.org/',
    'https://climateactiontracker.org/',
    'https://www.nhs.uk/',
    'https://www.mayoclinic.org/',
    'https://www.allaboutcircuits.com/',
    'https://www.electronics-tutorials.ws/',
    'https://www.ti.com/',
    'https://www.microchip.com/',
    'https://www.arduino.cc/',
    'https://www.raspberrypi.com/',
    'https://nomad-lab.eu/nomad-lab/',
    'https://www.oecd.org/en/data.html',
    'https://data.imf.org/en',
    'https://science.nasa.gov/earth/earth-observatory/',
    'https://www.analog.com/en/index.html',
    'https://www.st.com/content/st_com/en.html',
    'https://data.gov.sg/',
    'https://www.moe.gov.sg/',
    'https://www.nparks.gov.sg/',
    'https://www.govinfo.gov/',
    'https://www.grants.gov/',
    'https://www.uspto.gov/',
    'https://www.ons.gov.uk/',
    'https://www.metoffice.gov.uk/',
    'https://www.data.gov.uk/',
    'https://www.ukri.org/',
    'https://www.britishcouncil.org/',
    'https://www.dfg.de/',
    'https://www.bahn.de/',
    'https://meteofrance.com/',
    'https://www.data.gouv.fr/',
    'https://www.culture.gouv.fr/',
    'https://www.legifrance.gouv.fr/',
    'https://www.korea.kr/',
    'https://www.data.go.kr/',
    'https://www.canada.ca/',
    'https://www.statcan.gc.ca/',
    'https://weather.gc.ca/',
    'https://www.lta.gov.sg/content/ltagov/en.html',
    'https://www.nlb.gov.sg/main/home',
    'https://www.bundesregierung.de/breg-de',
    'https://www.bundesbank.de/en',
    'https://www.daad.de/de/',
    'https://www.insee.fr/fr/accueil',
    'https://www.service-public.gouv.fr/',
    'https://www.cnrs.fr/fr',
    'https://kosis.kr/index/index.do',
    'https://www.weather.go.kr/w/index.do',
    'https://www.studyinkorea.go.kr/ko/main.do',
    'https://english.visitkorea.or.kr/svc/main/index.do',
    'https://nrc.canada.ca/en/',
    'https://www.canada.ca/en/library-archives.html'
  ];
  function sanitize(raw){
    if(typeof raw!=='string'||raw.length>1800||/[\u0000-\u0020\u007f\\]/.test(raw))return null;
    try{
      const url = new URL(raw);
      if(!['https:','http:'].includes(url.protocol)||!url.hostname||url.username||url.password)return null;
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

  // A remembered preference is never a security certificate or a malicious-URL verdict.
  // Scope is the EXACT HTTPS URL without query or fragment, valid for 30 days.
  const APPROVAL_KEY='avenqir-external-approvals-v1';
  const APPROVAL_LIFETIME=30*24*60*60*1000;
  const APPROVAL_LIMIT=100;
  // Deterministic URL structure screening; not a malware, reputation or TLS certificate scan.
  const OPAQUE_REDIRECTORS=new Set(['bit.ly','tinyurl.com','t.co','is.gd','cutt.ly','rb.gy','shorturl.at']);
  const BLOCKED_NAME_SUFFIX=['.localhost','.local','.internal','.test','.invalid','.example'];
  function nonPublicIpv4(a){
    return a[0]===0||a[0]===10||a[0]===127||a[0]>=224||
      (a[0]===100&&a[1]>=64&&a[1]<=127)||
      (a[0]===169&&a[1]===254)||
      (a[0]===172&&a[1]>=16&&a[1]<=31)||
      (a[0]===192&&(a[1]===0||a[1]===168||a[1]===88&&a[2]===99))||
      (a[0]===198&&(a[1]===18||a[1]===19||a[1]===51&&a[2]===100))||
      (a[0]===203&&a[1]===0&&a[2]===113);
  }
  function nonPublicIpv6(v){
    const addr=v.toLowerCase();
    const prefix=addr.slice(0,3);
    return addr==='::'||addr==='::1'||addr.startsWith('::ffff:')||
      addr.startsWith('fc')||addr.startsWith('fd')||
      ['fe8','fe9','fea','feb'].includes(prefix)||
      addr.startsWith('ff')||addr.startsWith('2001:db8:')||
      addr==='2001:db8::';
  }
  function urlRisk(raw){
    const u=sanitize(raw);
    if(!u)return {blocked:true,forcePrompt:true,rememberable:false,reason:'危险协议、无效地址、空白反斜杠或网址含账号密码'};
    const host=u.hostname.toLowerCase();
    const naked=host.endsWith('.')?host.slice(0,-1):host;
    if(naked==='localhost'||naked==='localhost.localdomain'||naked==='0.0.0.0'||
       BLOCKED_NAME_SUFFIX.some(x=>naked.endsWith(x))||
       naked==='169.254.169.254'||!naked.includes('.')) {
      // IPv6 literals are treated separately (their bracket form contains colons).
      if(!naked.startsWith('['))return {blocked:true,forcePrompt:true,rememberable:false,reason:'本地、内部或保留的网络主机已拒绝'};
    }
    const ipv4=naked.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if(ipv4){
      const a=ipv4.slice(1).map(Number);
      if(a.some(v=>v>255)||nonPublicIpv4(a))return {blocked:true,forcePrompt:true,rememberable:false,reason:'私有、共享、文档测试或其他非公网 IPv4 地址已拒绝'};
    }
    const ipv6=naked.startsWith('[')&&naked.endsWith(']');
    if(ipv6&&nonPublicIpv6(naked.slice(1,-1)))return {blocked:true,forcePrompt:true,rememberable:false,reason:'本地、映射或非公网 IPv6 地址已拒绝'};
    const redirector=OPAQUE_REDIRECTORS.has(naked);
    const highRisk=u.protocol!=='https:'||naked.includes('xn--')||!!ipv4||ipv6||
      redirector||naked.endsWith('.zip')||naked.endsWith('.mov')||
      (u.port&&u.port!=='443')||!!u.search||!!u.hash||u.href.length>1024;
    return {blocked:false,forcePrompt:highRisk,rememberable:!highRisk,reason:highRisk?
      '需要额外核对：短链接、IP 字面地址、特殊域名、HTTP、端口或参数不支持记住跳转':'来源需另行核对；结构检查不等于安全认证'};
  }
  function readApprovals(storage){
    try{
      const value=JSON.parse(storage.getItem(APPROVAL_KEY)||'null');
      if(!value||value.version!==1||!Array.isArray(value.items))return [];
      const now=Date.now();
      return value.items.filter(x=>x&&typeof x.url==='string'&&
        Number.isFinite(x.expires)&&x.expires>now&&x.expires<=now+APPROVAL_LIFETIME&&
        urlRisk(x.url).rememberable).slice(-APPROVAL_LIMIT);
    }catch{return [];}
  }
  function isRemembered(raw,storage){
    const u=sanitize(raw),risk=urlRisk(raw);
    if(!u||risk.blocked||risk.forcePrompt||!storage)return false;
    return readApprovals(storage).some(x=>x.url===u.href);
  }
  function remember(raw,storage){
    const u=sanitize(raw),risk=urlRisk(raw);
    if(!u||!risk.rememberable||!storage)return false;
    try{
      const items=readApprovals(storage).filter(x=>x.url!==u.href);
      items.push({url:u.href,expires:Date.now()+APPROVAL_LIFETIME});
      storage.setItem(APPROVAL_KEY,JSON.stringify({version:1,items:items.slice(-APPROVAL_LIMIT)}));
      return true;
    }catch{return false;}
  }
  function clearRemembered(storage){
    try{storage?.removeItem(APPROVAL_KEY);return true;}catch{return false;}
  }
  function approvalCount(storage){return storage?readApprovals(storage).length:0;}
  function maySkipConfirmation(raw,storage){
    const risk=urlRisk(raw);
    return !risk.blocked&&!risk.forcePrompt&&
      (officialSourceReviewed(raw)||isRemembered(raw,storage));
  }
  const api=Object.freeze({sanitize,officialSourceReviewed,searchEngineDestination,urlRisk,isRemembered,remember,clearRemembered,approvalCount,maySkipConfirmation,APPROVAL_LIFETIME,OFFICIAL_URLS:Object.freeze(OFFICIAL_URLS.slice())});
  root.AVENQIR_LINK_GATE=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
