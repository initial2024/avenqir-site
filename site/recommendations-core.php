<?php
declare(strict_types=1);

function rec_catalog(): array {
    $data=json_decode((string)file_get_contents(__DIR__.'/recommendations-catalog.json'),true,512,JSON_THROW_ON_ERROR);
    return array_column($data,null,'id');
}

function rec_token($value): bool {
    return is_string($value) && preg_match('/\A[a-f0-9]{64}\z/D',$value)===1;
}

function rec_schema(PDO $db): void {
    $db->exec("CREATE TABLE IF NOT EXISTS aq_rec_daily (
        tool_id VARCHAR(40) NOT NULL, day_id INT NOT NULL, hits INT UNSIGNED NOT NULL,
        PRIMARY KEY (day_id,tool_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=ascii COLLATE=ascii_bin");
    $db->exec("CREATE TABLE IF NOT EXISTS aq_rec_ratings (
        tool_id VARCHAR(40) NOT NULL, voter_hash CHAR(64) NOT NULL, stars TINYINT UNSIGNED NOT NULL,
        updated_at INT UNSIGNED NOT NULL, PRIMARY KEY (tool_id,voter_hash), INDEX (voter_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=ascii COLLATE=ascii_bin");
    $db->exec("CREATE TABLE IF NOT EXISTS aq_rec_quota (
        expires INT UNSIGNED NOT NULL, budget_hash CHAR(64) NOT NULL, hits INT UNSIGNED NOT NULL,
        PRIMARY KEY (expires,budget_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=ascii COLLATE=ascii_bin");
}

function rec_budget(PDO $db, string $key, string $kind, string $subject, int $expires, int $limit): bool {
    // Each window has its own digest. Neither the IP nor a stable IP digest is written.
    $digest=hash_hmac('sha256',"limit\0".$kind."\0".$expires."\0".$subject,$key);
    $write=$db->prepare('INSERT INTO aq_rec_quota (expires,budget_hash,hits) VALUES (?,?,1)
        ON DUPLICATE KEY UPDATE hits=hits+1');
    $write->execute([$expires,$digest]);
    $read=$db->prepare('SELECT hits FROM aq_rec_quota WHERE expires=? AND budget_hash=?');
    $read->execute([$expires,$digest]);
    return (int)$read->fetchColumn()<=$limit;
}

function rec_write(PDO $db, string $key, array $data, string $peer, int $now): string {
    $action=$data['action'];
    $tool=$data['tool_id']??'';
    $token=$data['voter_token'];
    $voter=hash_hmac('sha256',"vote\0".$token,$key);
    $day=intdiv($now,86400);
    $dayEnd=($day+1)*86400;
    $minuteEnd=(intdiv($now,60)+1)*60;
    $hourEnd=(intdiv($now,3600)+1)*3600;
    $peer=filter_var($peer,FILTER_VALIDATE_IP)?$peer:'unknown';

    // All limits and the corresponding change commit together.
    $db->beginTransaction();
    try {
        if (!rec_budget($db,$key,'global','all',$minuteEnd,120) ||
            !rec_budget($db,$key,$action==='click'?'peer-click':'peer-write',$peer,
                $action==='click'?$minuteEnd:$hourEnd,$action==='click'?10:12)) {
            $db->rollBack();
            return 'limited';
        }
        if ($action==='click') {
            if (!rec_budget($db,$key,'click-token',$tool."\0".$token,$dayEnd,1)) {
                $db->commit();
                return 'duplicate';
            }
            $sql='INSERT INTO aq_rec_daily (tool_id,day_id,hits) VALUES (?,?,1)
                ON DUPLICATE KEY UPDATE hits=hits+1';
            $db->prepare($sql)->execute([$tool,$day]);
        } elseif ($action==='clear') {
            $db->prepare('DELETE FROM aq_rec_ratings WHERE voter_hash=?')->execute([$voter]);
        } elseif ($action==='remove') {
            $db->prepare('DELETE FROM aq_rec_ratings WHERE tool_id=? AND voter_hash=?')->execute([$tool,$voter]);
        } else {
            if (!rec_budget($db,$key,'rate-day',$tool."\0".$token,$dayEnd,3)) {
                $db->commit();
                return 'limited';
            }
            $sql='INSERT INTO aq_rec_ratings (tool_id,voter_hash,stars,updated_at) VALUES (?,?,?,?)
                ON DUPLICATE KEY UPDATE stars=VALUES(stars), updated_at=VALUES(updated_at)';
            $db->prepare($sql)->execute([$tool,$voter,$data['stars'],$now]);
        }
        $db->commit();
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
    // On a shared host we prune opportunistically during writes. Stats always filter by time.
    try {
        $db->prepare('DELETE FROM aq_rec_quota WHERE expires<=? LIMIT 500')->execute([$now]);
        $db->prepare('DELETE FROM aq_rec_daily WHERE day_id<? LIMIT 500')->execute([$day-89]);
    } catch (PDOException $error) {
        error_log('AVENQIR recommendations retention cleanup failed');
    }
    return 'recorded';
}

function rec_stats(PDO $db, array $catalog, int $now, int $window): array {
    $stats=[];
    $day=intdiv($now,86400);
    try {
        $ratings=$db->query('SELECT tool_id, COUNT(*) AS n, SUM(stars) AS total FROM aq_rec_ratings GROUP BY tool_id');
        $clicks=$db->prepare('SELECT tool_id, day_id, hits FROM aq_rec_daily WHERE day_id BETWEEN ? AND ?');
        $clicks->execute([$day-89,$day]);
    } catch (PDOException $error) {
        if ($error->getCode()==='42S02') return []; // No participant has initialized the data yet.
        throw $error;
    }
    $n=0;
    $total=0;
    foreach ($ratings as $row) {
        $id=$row['tool_id'];
        if (!isset($catalog[$id])) continue;
        $stats[$id]['ratings']=(int)$row['n'];
        $stats[$id]['sum']=(int)$row['total'];
        if ((int)$row['n']>=5) {
            $n+=(int)$row['n'];
            $total+=(int)$row['total'];
        }
    }
    $prior=$n>=20?$total/$n:3.5;
    $maxHeat=0.0;
    foreach ($clicks as $row) {
        $id=$row['tool_id'];
        $age=$day-(int)$row['day_id'];
        if (!isset($catalog[$id]) || $age>=$window) continue;
        $hits=(int)$row['hits'];
        $stats[$id]['clicks']=($stats[$id]['clicks']??0)+$hits;
        $stats[$id]['heat']=($stats[$id]['heat']??0)+$hits*exp(-$age/$window);
        $maxHeat=max($maxHeat,$stats[$id]['heat']);
    }
    $items=[];
    foreach ($stats as $id=>$row) {
        $count=$row['ratings']??0;
        $heat=$row['heat']??0;
        $average=$count>=5?$row['sum']/$count:null;
        $rating=$average===null?$prior:($row['sum']+5*$prior)/($count+5);
        $items[$id]=[
            'count'=>$count, 'average'=>$average===null?null:round($average,1),
            'clicks'=>$row['clicks']??0,
            'score'=>$average===null && $heat===0?null:(int)round(100*(0.6*$rating/5+0.4*($maxHeat>0?$heat/$maxHeat:0))),
        ];
    }
    return $items;
}
