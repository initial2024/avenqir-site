"use strict";
/* AVENQIR v8.7: semantic category groups, not a separate count of websites. */
(function(root){
 const groups=[{"id":"study","title":"学习与研究","icon":"📚","description":"论文、课程、数学、词典和阅读","categories":["学术","科研","教育","英语阅读","语言","阅读","数学"]},{"id":"science","title":"科学与工程","icon":"🧪","description":"物理、材料、化学、生命和地球","categories":["科学","材料","化学","物理","天文","生物","地球科学","环境气候","医疗健康","电子工程"]},{"id":"ai","title":"AI 与数据","icon":"🧠","description":"模型、检测、对话和开放数据","categories":["AI","AI交流","AI检测","数据"]},{"id":"developer","title":"开发与部署","icon":"⌘","description":"编程、前端、数据库与开源","categories":["开发","前端开发","数据库","运维部署","开源项目"]},{"id":"network","title":"网络与安全","icon":"🛡️","description":"互联网、隐私、IP 和风险检查","categories":["网络","安全","互联网"]},{"id":"design","title":"设计与创作","icon":"🎨","description":"图像设计、产品体验和音视频","categories":["创作","产品设计","音视频"]},{"id":"life","title":"生活与探索","icon":"🧭","description":"地图、工具、办公、游戏和旅行","categories":["休闲","实用","旅游出行","地图","在线办公","软件应用"]},{"id":"world","title":"人文与资讯","icon":"🌍","description":"新闻、历史、公共政策和经济","categories":["新闻","文化","人文历史","科技资讯","法律政策","经济金融"]}];
 const index=Object.create(null);
 for(const g of groups)for(const category of g.categories)index[category]=g.id;
 function groupFor(category){return typeof category==='string'&&Object.prototype.hasOwnProperty.call(index,category)?index[category]:null;}
 function categoriesFor(id){return groups.find(x=>x.id===id)?.categories||[];}
 const api=Object.freeze({groups:Object.freeze(groups),groupFor,categoriesFor});
 root.AVENQIR_ATLAS_TAXONOMY=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
