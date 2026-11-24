<?php
declare(strict_types=1);
const MAX_LINKS = 300;

/* Storage hotfix 7.1: write-probe instead of unreliable permission preflight.
 * Never store raw JSON or credentials in a web-readable file. */
$GLOBALS['AVENQIR_STORAGE_ERROR'] = '';
function store_fail(string $reason): bool {
  $GLOBALS['AVENQIR_STORAGE_ERROR'] = $reason;
  return false;
}
function store_failure_reason(): string {
  return (string)($GLOBALS['AVENQIR_STORAGE_ERROR'] ?? '原因未知');
}
function store_path(string $name): string {
  if (!in_array($name, ['auth', 'links', 'passkeys', 'owner_sites', 'status_quota'], true)) {
    throw new InvalidArgumentException('Invalid storage key');
  }
  return __DIR__.'/_store/'.$name.'.php';
}
function stored_read(string $name): ?array {
  $file = store_path($name);
  if (!is_file($file)) return null;
  $raw = @file_get_contents($file);
  if (!is_string($raw)) return null;
  $at = strpos($raw, "\n");
  if ($at === false) return null;
  $data = json_decode(substr($raw, $at + 1), true);
  return is_array($data) ? $data : null;
}
function store_init(string $dir): bool {
  if (!is_dir($dir)) {
    if (file_exists($dir) || !@mkdir($dir, 0755, false)) {
      return store_fail('STORE_DIR_MISSING：_store 目录不存在且 PHP 无法创建。请确认已上传到域名专属 htdocs。');
    }
  }
  $deny = "DirectoryIndex index.php\n<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n";
  if (!is_file($dir.'/.htaccess')) {
    if (@file_put_contents($dir.'/.htaccess', $deny, LOCK_EX) !== strlen($deny)) {
      return store_fail('STORE_PROTECTION_FAILED：无法创建 _store/.htaccess，已停止写入。');
    }
  }
  if (!is_file($dir.'/index.php')) {
    if (@file_put_contents($dir.'/index.php', "<?php http_response_code(404); exit;\n", LOCK_EX) === false) {
      return store_fail('STORE_INDEX_FAILED：无法创建 _store/index.php。');
    }
  }
  return true;
}
function stored_write(string $name, array $data): bool {
  $GLOBALS['AVENQIR_STORAGE_ERROR'] = '';
  $file = store_path($name);
  $dir = dirname($file);
  if (!store_init($dir)) return false;
  try {
    $encoded = json_encode($data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    $suffix = bin2hex(random_bytes(10));
  } catch (Throwable $e) {
    return store_fail('STORE_ENCODE_FAILED：生成存储内容失败。');
  }
  $payload = '<?php http_response_code(404); exit; __halt_compiler();'."\n".$encoded;
  // Avoid tempnam(): it may silently fall back outside the site htdocs.
  // Avoid is_writable() and chmod(): some shared hosts disable or misreport both.
  $tmp = $dir.'/.write-'. $suffix .'.php';
  $handle = @fopen($tmp, 'xb');
  if ($handle === false) {
    return store_fail('STORE_CREATE_FAILED：无法在 _store 里创建临时文件；可能被主机文件系统限制。');
  }
  $ok = true; $written = 0; $length = strlen($payload);
  while ($written < $length) {
    $n = @fwrite($handle, substr($payload, $written));
    if ($n === false || $n === 0) { $ok = false; break; }
    $written += $n;
  }
  if ($ok && !@fflush($handle)) $ok = false;
  @fclose($handle);
  if (!$ok) {
    @unlink($tmp);
    return store_fail('STORE_WRITE_FAILED：文件创建成功，但写入数据失败。');
  }
  if (!@rename($tmp, $file)) {
    @unlink($tmp);
    return store_fail('STORE_RENAME_FAILED：写入成功但不能完成原子替换。');
  }
  $check = @file_get_contents($file);
  if (!is_string($check) || !hash_equals(hash('sha256', $payload), hash('sha256', $check))) {
    return store_fail('STORE_VERIFY_FAILED：写入后数据校验失败，请停止后台操作。');
  }
  return true;
}
function seed_links(): array {
  $a = require __DIR__.'/seed-links.php';
  return is_array($a) ? $a : [];
}
function public_links(): array {
  $s = stored_read('links');
  return $s===null ? seed_links() : $s;
}
function text_limit($x, int $max): string {
  if (!is_string($x)) return '';
  $x = trim(strip_tags($x));
  return function_exists('mb_substr') ? mb_substr($x, 0, $max, 'UTF-8') : substr($x, 0, $max);
}
/* Deterministic high-confidence server hints; never infer site trust, IP country or language from TLD. */
function infer_link_category(string $name,string $url,string $desc): string {
  $host=(string)(parse_url($url,PHP_URL_HOST)?:'');
  $host=strtolower($host);
  $known=[
    'github.com'=>'开源项目','gitlab.com'=>'开源项目','codeberg.org'=>'开源项目',
    'developer.mozilla.org'=>'前端开发','w3.org'=>'前端开发','npmjs.com'=>'开发','pypi.org'=>'开发',
    'arxiv.org'=>'学术','scholar.google.com'=>'学术','pubmed.ncbi.nlm.nih.gov'=>'学术',
    'materialsproject.org'=>'材料','webbook.nist.gov'=>'化学',
    'desmos.com'=>'数学','geogebra.org'=>'数学','openstreetmap.org'=>'地图',
    'amap.com'=>'地图','map.baidu.com'=>'地图','huggingface.co'=>'AI官网',
    'openai.com'=>'AI官网','anthropic.com'=>'AI官网','midjourney.com'=>'AI绘图',
    'runwayml.com'=>'AI视频','cursor.com'=>'AI编程'
  ];
  foreach($known as $domain=>$category){
    if($host===$domain || str_ends_with($host,'.'.$domain))return $category;
  }
  $context=function_exists('mb_strtolower')?mb_strtolower($name.' '.$desc,'UTF-8'):strtolower($name.' '.$desc);
  $terms=[
    '材料'=>['材料科学','晶体结构','材料性能','materials science'],
    '数学'=>['数学计算','函数绘图','mathematics','graphing calculator'],
    '学术'=>['学术论文','论文检索','学术搜索','academic papers','preprint'],
    '网络'=>['网络诊断','域名解析','traceroute','ipv6'],
    '地图'=>['地图导航','地图数据','geospatial'],
    'AI绘图'=>['图像生成','文生图','image generation'],
    'AI视频'=>['视频生成','文生视频','video generation'],
    'AI语音'=>['语音合成','配音生成','speech synthesis'],
    'AI编程'=>['代码助手','智能编程','ai coding'],
    '安全'=>['网络安全','漏洞检测','security audit'],
    '旅游出行'=>['铁路客运','火车时刻','public transit'],
    '化学'=>['化学物性','分子结构','chemical database']
  ];
  $hits=[];
  foreach($terms as $category=>$phrases)foreach($phrases as $phrase){
    if(str_contains($context,$phrase)){$hits[$category]=true;break;}
  }
  return count($hits)===1?array_key_first($hits):'待分类';
}
function normalize_link_language($lang): ?string {
  if(!is_string($lang))return null;
  $tag=strtolower(str_replace('_','-',trim($lang)));
  if(preg_match('/^zh-(?:hant|tw|hk|mo)(?:-|$)/',$tag))return 'zh-Hant';
  if($tag==='zh'||preg_match('/^zh-(?:hans|cn|sg)(?:-|$)/',$tag))return 'zh-Hans';
  $base=explode('-',$tag)[0];
  if($base==='nb'||$base==='nn')$base='no';
  if($base==='tl')$base='fil';
  $supported=explode(' ','en ja ko fr de es pt it nl sv no da fi pl cs sk hu ro bg hr sr sl el ru uk tr ar he fa hi bn ur th vi id ms fil af');
  return in_array($base,$supported,true)?$base:null;
}
function valid_link_languages($value): ?array {
  if($value===null||$value==='')return [];
  $list=is_array($value)?$value:(is_string($value)?explode(',',$value):null);
  if(!is_array($list)||count($list)>8)return null;
  $langs=[];
  foreach($list as $raw){
    $code=normalize_link_language($raw);
    if($code===null)return null;
    if(!in_array($code,$langs,true))$langs[]=$code;
  }
  return $langs;
}
function valid_link($name, $url, $cat, $desc, $id='', $languages=''): ?array {
  $name=text_limit($name,90);$url=text_limit($url,1800);
  $cat=text_limit($cat,40);$desc=text_limit($desc,320);
  if($name===''||strlen($url)>1800)return null;
  $p=@parse_url($url);
  if(!is_array($p)||!isset($p['scheme'],$p['host'])||!in_array(strtolower($p['scheme']),['http','https'],true))return null;
  if(isset($p['user'])||isset($p['pass'])||preg_match('/[\s\x00-\x1f]/',$url))return null;
  if(!filter_var($url,FILTER_VALIDATE_URL))return null;
  if($cat==='')$cat=infer_link_category($name,$url,$desc);
  $langs=valid_link_languages($languages);
  if($langs===null)return null;
  $row=['id'=>$id!==''?$id:bin2hex(random_bytes(10)),'name'=>$name,'url'=>$url,'category'=>$cat,'description'=>$desc];
  if($langs)$row['languages']=$langs;
  return $row;
}
function e($s): string {return htmlspecialchars((string)$s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
