<?php
declare(strict_types=1);
/* URL metadata regression only: no web requests, stores, credentials or admin session. */
require __DIR__.'/../site/server-core.php';
function check($truth,string $message): void {
  if(!$truth){fwrite(STDERR,"FAIL: ".$message."\n");exit(1);}
}
$known=valid_link('GitHub issue tracker','https://github.com/example/project','','Project source','','en,ja,zh-Hans');
check(is_array($known),'known source accepts URL');
check($known['category']==='开源项目','known domain gets category');
check(($known['languages']??[])===['en','ja','zh-Hans'],'explicit locale tags retained');
$manual=valid_link('My editor','https://github.com/example/new','个人推荐','代码管理','','fr');
check($manual['category']==='个人推荐','explicit admin category wins over auto');
$unknown=valid_link('Unknown page','https://unidentified.example.org/','','Misc page');
check($unknown['category']==='待分类','unknown domain remains pending classification');
check(!isset($unknown['languages']),'unknown website language remains unknown');
$local=valid_link('Japanese website','https://example.jp/','','Generic page');
check(!isset($local['languages']),'country-code TLD cannot imply Japanese content');
$image=valid_link('AI art tool','https://example.org/en/','','image generation');
check($image['category']==='AI绘图','unambiguous keyword can be categorized');
check(valid_link('Bad language','https://example.org/','','','','xx,ja')===null,'unsupported language rejected');
check(valid_link('Too many','https://example.org/','','','','en,ja,fr,de,es,pt,it,ko,zh-Hans')===null,'more than eight language labels rejected');
check(valid_link('Credentials','https://user:pass@example.org/','','')===null,'URL credentials blocked');
check(valid_link('XSS','javascript:alert(1)','','')===null,'script URI blocked');
check(valid_link('Existing record','https://example.org/','开发','', 'original-id', ['en','en','zh-TW'])['languages']===['en','zh-Hant'],'language normalization and duplicate removal');
echo "PASS: PHP admin auto-category evidence thresholds, unknown classification, explicit multilingual tags, manual priority and unsafe input rejection\n";
