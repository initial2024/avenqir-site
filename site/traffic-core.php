<?php
declare(strict_types=1);
// First-party, opt-in aggregate statistics. Never store raw IPs, referrers or visitor IDs.
const AQ_TRAFFIC_PAGES=['home','directory','recommendations','bookmarks','notes','fun','daily','tools','check','transfer','appearance','privacy','other'];
const AQ_TRAFFIC_SOURCES=['direct','internal','xiaohongshu','search','social','other'];
function aq_traffic_day(int $now):int {return intdiv($now+28800,86400);}
function aq_traffic_network(string $ip):array {
    $bytes=@inet_pton($ip);
    if($bytes===false)return ['unknown',null];
    if(strlen($bytes)===16 && substr($bytes,0,12)===str_repeat("\0",10)."\xff\xff"){$bytes=substr($bytes,12);$ip=inet_ntop($bytes);}
    if(!filter_var($ip,FILTER_VALIDATE_IP,FILTER_FLAG_NO_PRIV_RANGE|FILTER_FLAG_NO_RES_RANGE))return ['unknown',null];
    if(strlen($bytes)===4){
        if(ord($bytes[0])===100&&(ord($bytes[1])&192)===64)return ['unknown',null];
        return ['ipv4',substr($bytes,0,3)];
    }
    return ['ipv6',substr($bytes,0,6)];
}
function aq_traffic_digest(string $key,int $day,string $family,?string $prefix):?string {
    return $prefix===null?null:hash_hmac('sha256',"aq-traffic-v1\0".$day."\0".$family."\0".$prefix,$key);
}
function aq_traffic_input($data):bool {
    return is_array($data)&&count($data)===2&&is_string($data['page']??null)&&is_string($data['source']??null)
        &&in_array($data['page'],AQ_TRAFFIC_PAGES,true)&&in_array($data['source'],AQ_TRAFFIC_SOURCES,true);
}
function aq_traffic_schema(PDO $db):void {
    // Only authenticated owner enable action may create tables.
    $db->exec("CREATE TABLE IF NOT EXISTS aq_traffic_config (id TINYINT PRIMARY KEY, enabled TINYINT NOT NULL) ENGINE=InnoDB");
    $db->exec("INSERT IGNORE INTO aq_traffic_config (id,enabled) VALUES (1,0)");
    $db->exec("CREATE TABLE IF NOT EXISTS aq_traffic_total (day_id INT PRIMARY KEY, hits INT UNSIGNED NOT NULL, networks INT UNSIGNED NOT NULL) ENGINE=InnoDB");
    $db->exec("CREATE TABLE IF NOT EXISTS aq_traffic_daily (day_id INT NOT NULL,page VARCHAR(24) NOT NULL,source VARCHAR(24) NOT NULL,family VARCHAR(12) NOT NULL,hits INT UNSIGNED NOT NULL,PRIMARY KEY(day_id,page,source,family)) ENGINE=InnoDB DEFAULT CHARSET=ascii");
    $db->exec("CREATE TABLE IF NOT EXISTS aq_traffic_network (day_id INT NOT NULL,digest CHAR(64) NOT NULL,hits INT UNSIGNED NOT NULL,PRIMARY KEY(day_id,digest)) ENGINE=InnoDB DEFAULT CHARSET=ascii");
}
function aq_traffic_enabled(PDO $db):bool {
    try{return (int)$db->query('SELECT enabled FROM aq_traffic_config WHERE id=1')->fetchColumn()===1;}
    catch(PDOException $e){if($e->getCode()==='42S02')return false;throw $e;}
}
function aq_traffic_prune(PDO $db,int $day):void {
    $db->prepare('DELETE FROM aq_traffic_network WHERE day_id<?')->execute([$day-1]);
    foreach(['aq_traffic_total','aq_traffic_daily'] as $table)$db->prepare("DELETE FROM $table WHERE day_id<?")->execute([$day-29]);
}
function aq_traffic_record(PDO $db,array $input,string $ip,string $key,int $now):void {
    if(!aq_traffic_input($input)||!aq_traffic_enabled($db))return;
    $day=aq_traffic_day($now);
    [$family,$prefix]=aq_traffic_network($ip);
    $digest=aq_traffic_digest($key,$day,$family,$prefix);
    $db->beginTransaction();
    try{
        // Serialize bounded writes with owner on/off/erase. Counts are estimates, not audit logs.
        if((int)$db->query('SELECT enabled FROM aq_traffic_config WHERE id=1 FOR UPDATE')->fetchColumn()!==1){$db->rollBack();return;}
        $q=$db->prepare('SELECT hits FROM aq_traffic_total WHERE day_id=?');$q->execute([$day]);
        if((int)$q->fetchColumn()>=50000){$db->rollBack();return;}
        $new=0;
        if($digest!==null){
            $q=$db->prepare('SELECT hits FROM aq_traffic_network WHERE day_id=? AND digest=?');$q->execute([$day,$digest]);$hits=$q->fetchColumn();
            if($hits!==false&&(int)$hits>=120){$db->rollBack();return;}
            $new=$hits===false?1:0;
            $db->prepare('INSERT INTO aq_traffic_network (day_id,digest,hits) VALUES (?,?,1) ON DUPLICATE KEY UPDATE hits=hits+1')->execute([$day,$digest]);
        }
        $db->prepare('INSERT INTO aq_traffic_total (day_id,hits,networks) VALUES (?,1,?) ON DUPLICATE KEY UPDATE hits=hits+1,networks=networks+VALUES(networks)')->execute([$day,$new]);
        $db->prepare('INSERT INTO aq_traffic_daily (day_id,page,source,family,hits) VALUES (?,?,?,?,1) ON DUPLICATE KEY UPDATE hits=hits+1')->execute([$day,$input['page'],$input['source'],$family]);
        $db->commit();
    }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
    // No scheduled job; old data is physically pruned on the next write or owner view.
    aq_traffic_prune($db,$day);
}
function aq_traffic_report(PDO $db,int $day,int $days):array {
    $start=$day-$days+1;
    $q=$db->prepare('SELECT day_id,hits,networks FROM aq_traffic_total WHERE day_id BETWEEN ? AND ? ORDER BY day_id DESC');$q->execute([$start,$day]);
    $daily=$q->fetchAll();
    $groups=[];
    foreach(['page','source','family'] as $column){
        $q=$db->prepare("SELECT $column AS label,SUM(hits) AS hits FROM aq_traffic_daily WHERE day_id BETWEEN ? AND ? GROUP BY $column ORDER BY hits DESC");$q->execute([$start,$day]);$groups[$column]=$q->fetchAll();
    }
    return ['daily'=>$daily,'groups'=>$groups];
}
