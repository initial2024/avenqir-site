<?php
declare(strict_types=1);
/* AVENQIR private message centre, v8.1. No PHP mail, no public accounts. */
function fb_conf(): array {
    static $c = null;
    if (is_array($c)) return $c;
    $f = __DIR__.'/_private/feedback-config.php';
    $v = is_file($f) ? require $f : [];
    $c = is_array($v) ? $v : [];
    return $c;
}
function fb_ready(): bool {
    $c=fb_conf();
    foreach (['db_host','db_name','db_user','db_password','ip_hmac_secret'] as $k) {
        if (!isset($c[$k]) || !is_string($c[$k]) || trim($c[$k])==='' || str_contains($c[$k], 'REPLACE_')) return false;
    }
    return (bool)preg_match('/^[a-zA-Z0-9_]{1,64}$/D', $c['db_name']) &&
        (bool)preg_match('/^[a-zA-Z0-9_.-]{1,255}$/D', $c['db_host']) &&
        strlen($c['ip_hmac_secret'])>=32;
}
function fb_db(): PDO {
    static $pdo=null;
    if ($pdo instanceof PDO) return $pdo;
    if (!fb_ready()) throw new RuntimeException('NOT_CONFIGURED');
    $c=fb_conf();
    if (!extension_loaded('pdo_mysql')) throw new RuntimeException('MYSQL_DRIVER_UNAVAILABLE');
    try {
        $pdo=new PDO('mysql:host='.$c['db_host'].';dbname='.$c['db_name'].';charset=utf8mb4', $c['db_user'], $c['db_password'], [
            PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES=>false,
            PDO::ATTR_TIMEOUT=>5,
        ]);
        return $pdo;
    } catch (PDOException $e) {
        error_log('AVENQIR Feedback DB connection failed');
        throw new RuntimeException('DB_UNAVAILABLE');
    }
}
function fb_tables(PDO $pdo): void {
    // Only called by the site's owner on first-time setup, not by public traffic.
    $pdo->exec("CREATE TABLE IF NOT EXISTS fb_settings (
        setting_key VARCHAR(64) PRIMARY KEY,
        setting_value TEXT NOT NULL
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB");
    $pdo->exec("CREATE TABLE IF NOT EXISTS fb_messages (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        kind VARCHAR(30) NOT NULL,
        sender_name VARCHAR(60) NOT NULL,
        sender_email VARCHAR(190) NOT NULL DEFAULT '',
        subject VARCHAR(120) NOT NULL,
        body TEXT NOT NULL,
        ref_url VARCHAR(1400) NOT NULL DEFAULT '',
        status VARCHAR(16) NOT NULL DEFAULT 'new',
        ip_digest CHAR(64) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX ix_fb_ip (ip_digest, created_at),
        INDEX ix_fb_status (status, created_at)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB");
    $pdo->exec("CREATE TABLE IF NOT EXISTS fb_login_attempts (
        ip_digest CHAR(64) NOT NULL,
        at_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX ix_fb_attempt (ip_digest, at_time)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB");
}
function fb_e(string $s): string { return htmlspecialchars($s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8'); }
function fb_trim($x,int $max): string {
    $x=is_string($x) ? trim(str_replace("\0",'', $x)) : '';
    if (function_exists('mb_substr')) return mb_substr($x,0,$max,'UTF-8');
    if (preg_match('//u',$x)===1) return implode('',array_slice(preg_split('//u',$x,-1,PREG_SPLIT_NO_EMPTY),0,$max));
    return substr($x,0,$max);
}
function fb_ip_hash(): string {
    $ip=(string)($_SERVER['REMOTE_ADDR']??'unknown');
    // HMAC prevents revealing original IP from a backed-up messages table.
    return hash_hmac('sha256',$ip,(string)(fb_conf()['ip_hmac_secret']??''));
}
function fb_https(): bool {
    return in_array((string)($_SERVER['HTTPS']??''), ['on','1'],true) || (string)($_SERVER['SERVER_PORT']??'')==='443';
}
function fb_start_session(string $name): void {
    ini_set('session.use_strict_mode','1');
    ini_set('session.use_only_cookies','1');
    session_name($name);
    session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Lax']);
    session_start();
}
function fb_headers(): void {
    header('Cache-Control: no-store, private, max-age=0');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: no-referrer');
    header('Content-Security-Policy: default-src \'self\'; img-src \'self\'; style-src \'self\'; script-src \'self\'; form-action \'self\'; base-uri \'none\'; frame-ancestors \'none\'');
}
function fb_csrf(): string {
    if (!isset($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) $_SESSION['csrf']=bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}
function fb_csrf_ok(): bool {
    $a=fb_csrf();$b=(string)($_POST['csrf']??'');
    return $b!=='' && hash_equals($a,$b);
}
function fb_admin_hash(PDO $db): ?string {
    try {
        $s=$db->prepare("SELECT setting_value FROM fb_settings WHERE setting_key='admin_password' LIMIT 1");
        $s->execute();$v=$s->fetchColumn();return is_string($v)?$v:null;
    } catch (PDOException $e) {return null;}
}
/** The legacy admin_password setting only marks an existing installation.
 * Never verify it as a login secret after the adm consolidation.
 */
function fb_submission_enabled(PDO $db):bool{
  try{
    $s=$db->prepare("SELECT setting_key,setting_value FROM fb_settings WHERE setting_key IN ('feedback_enabled','admin_password')");
    $s->execute();
    foreach($s->fetchAll() as $row){
      if(($row['setting_key']??'')==='feedback_enabled' && ($row['setting_value']??'')==='1')return true;
      if(($row['setting_key']??'')==='admin_password' && is_string($row['setting_value']??null) && $row['setting_value']!=='')return true;
    }
  }catch(PDOException $e){return false;}
  return false;
}
function fb_config_message(Throwable $e): string {
    return match($e->getMessage()) {
        'NOT_CONFIGURED'=>'数据库连接尚未配置，请站长先完成安装。',
        'MYSQL_DRIVER_UNAVAILABLE'=>'当前 PHP 环境未启用 PDO MySQL 驱动。',
        default=>'留言服务暂不可用，稍后再试；其他网站功能不受影响。',
    };
}
function fb_nav(): string {
    return '<header class="headbar"><div class="wrap head-inner"><a class="logo" href="index.html"><span class="logoicon">⬡</span> AVENQIR</a><a class="aq-theme-link" data-aq-theme-link="1" href="appearance.html" aria-label="显示模式">◐ <span class="aq-theme-link-label">模式</span></a><button type="button" class="menu-toggle" aria-controls="global-nav" aria-expanded="false" aria-label="打开导航菜单">☰ <span>菜单</span></button><nav id="global-nav" class="main-nav" aria-label="网站导航"><a href="index.html">首页</a><a href="directory.html">网站搜索</a><a href="bookmarks.html">书签</a><a href="fun.html">解压乐园</a><a href="tools.html">工具箱</a><a href="feedback.php" class="active">留言反馈</a></nav><span class="microbadge">v8.1</span></div></header>';
}
