<?php
declare(strict_types=1);
require __DIR__.'/../site/feedback-core.php';

function wall_check(bool $condition, string $message): void {
    if(!$condition)throw new RuntimeException($message);
}

$db=new PDO('sqlite::memory:',null,null,[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
]);
$db->sqliteCreateFunction('CONCAT',fn($prefix,$id)=>$prefix.$id,2);
$db->exec('CREATE TABLE fb_settings (setting_key TEXT PRIMARY KEY, setting_value TEXT NOT NULL)');
$db->exec('CREATE TABLE fb_messages (
    id INTEGER PRIMARY KEY, kind TEXT, sender_name TEXT, sender_email TEXT,
    subject TEXT, body TEXT, ref_url TEXT, ip_digest TEXT, status TEXT DEFAULT \'new\',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)');
$db->exec("INSERT INTO fb_settings VALUES ('feedback_enabled','1')");
$message=[
    'kind'=>'feedback','name'=>'测试昵称','email'=>'private@example.invalid',
    'subject'=>'<b>界面建议</b>','body'=>'这是演示审核流程用的一段留言正文。',
    'ref_url'=>'https://example.invalid/private?example=hidden',
];

// The private row has the same shape as previously stored messages.
$private=(int)fb_save_message($db,$message,'private-digest',false);
$requested=(int)fb_save_message($db,$message,'public-digest',true);
wall_check(fb_submission_enabled($db),'Existing activation setting should still work');
wall_check(fb_wall_messages($db,'',0)===[],'Unreviewed and private feedback must be invisible');
wall_check(!fb_wall_moderate($db,$private,true),'No administrator publication without a public request');
wall_check(fb_wall_moderate($db,$requested,true),'Administrator may publish a public request');
$rows=fb_wall_messages($db,'',0);
wall_check(count($rows)===1 && (int)$rows[0]['id']===$requested,'Only the approved request should appear');
wall_check(array_keys($rows[0])===['id','kind','sender_name','subject','body','submitted_date'],'Keep all private columns out of the wall projection');
wall_check(fb_e($rows[0]['subject'])==='&lt;b&gt;界面建议&lt;/b&gt;','Public subjects should be HTML-escaped');
wall_check(fb_wall_messages($db,'link',0)===[],'Wall category filters should apply to approved rows');
wall_check(fb_wall_moderate($db,$requested,false) && fb_wall_messages($db,'',0)===[],'Withdrawing approval must remove the public row');
wall_check(fb_wall_moderate($db,$requested,true),'A previously requested message can be republished');
fb_delete_message($db,$requested);
wall_check(fb_wall_messages($db,'',0)===[],'Deleting an approved message removes it from the wall');
wall_check(!fb_wall_moderate($db,$requested,true),'Deleting a message must clear its approval metadata');
wall_check(fb_submission_enabled($db),'Deleting a message must leave the activation setting intact');

for($i=0;$i<FB_WALL_PAGE_SIZE+2;$i++){
    $id=(int)fb_save_message($db,$message,'public-digest',true);
    wall_check(fb_wall_moderate($db,$id,true),'Approve test page entry');
}
$page=fb_wall_messages($db,'feedback',0);
wall_check(count($page)===FB_WALL_PAGE_SIZE+1,'Read at most a page plus a pagination sentinel');
$older=fb_wall_messages($db,'feedback',(int)$page[FB_WALL_PAGE_SIZE-1]['id']);
wall_check(count($older)===2,'Cursor must fetch the older entries with no duplicate');

$count=(int)$db->query('SELECT COUNT(*) FROM fb_messages')->fetchColumn();
$db->exec("CREATE TRIGGER break_wall_insert BEFORE INSERT ON fb_settings
    WHEN NEW.setting_value='pending' BEGIN SELECT RAISE(ABORT,'write error'); END");
$failed=false;
try{fb_save_message($db,$message,'public-digest',true);}
catch(PDOException $e){$failed=true;}
wall_check($failed && !$db->inTransaction(),'Failed metadata writes must roll back the new message');
wall_check((int)$db->query('SELECT COUNT(*) FROM fb_messages')->fetchColumn()===$count,'No partially saved message after a failed public request');

echo "PASS feedback wall consent, moderation, private fields, filters, pagination and rollback\n";
