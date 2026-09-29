<?php
/**
 * Приём заявок с формы: отправка в Telegram и на почту.
 * Настройки — в config.php (скопируйте config.example.php).
 */

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');

function respond($ok, $error = null, $code = 200)
{
    http_response_code($code);
    echo json_encode($error ? ['ok' => $ok, 'error' => $error] : ['ok' => $ok], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Метод не поддерживается', 405);
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    respond(false, null, 500);
}
$config = require $configFile;

// Ловушка для ботов: настоящий посетитель это поле не видит
if (!empty($_POST['website'])) {
    respond(true);
}

// Не больше N заявок с одного IP за окно времени
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$limitFile = sys_get_temp_dir() . '/iq_rate_' . md5($ip);
$now = time();
$window = (int)($config['rate_window'] ?? 600);
$maxHits = (int)($config['rate_max'] ?? 5);
$hits = [];
if (is_file($limitFile)) {
    $hits = array_filter(
        (array)json_decode((string)file_get_contents($limitFile), true),
        function ($t) use ($now, $window) { return $t > $now - $window; }
    );
}
if (count($hits) >= $maxHits) {
    respond(false, 'Слишком много заявок подряд. Позвоните нам: +7 906 255-68-86', 429);
}
$hits[] = $now;
@file_put_contents($limitFile, json_encode(array_values($hits)));

function field($key, $max = 200)
{
    $v = trim((string)($_POST[$key] ?? ''));
    $v = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $v);
    return mb_substr($v, 0, $max);
}

$name    = field('name', 80);
$phone   = field('phone', 40);
$subject = field('subject', 60);
$exam    = field('exam', 10);
$page    = field('page', 300);

$digits = preg_replace('/\D/', '', $phone);
if (strlen($digits) === 11 && ($digits[0] === '7' || $digits[0] === '8')) {
    $digits = substr($digits, 1);
}
if (strlen($digits) !== 10) {
    respond(false, 'Проверьте номер: нужно 10 цифр после +7', 422);
}
if (empty($_POST['agree'])) {
    respond(false, 'Нужно согласие на обработку персональных данных', 422);
}
if (!in_array($exam, ['ЕГЭ', 'ОГЭ'], true)) {
    $exam = 'не указан';
}

$phoneFmt = sprintf('+7 (%s) %s-%s-%s', substr($digits, 0, 3), substr($digits, 3, 3), substr($digits, 6, 2), substr($digits, 8, 2));

$utm = [];
foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid'] as $k) {
    $v = field($k, 200);
    if ($v !== '') {
        $utm[] = "$k: $v";
    }
}

$lines = [
    'Новая заявка на пробник',
    '',
    'Экзамен: ' . $exam,
    'Предмет: ' . ($subject !== '' ? $subject : 'не указан'),
    'Имя: ' . ($name !== '' ? $name : 'не указано'),
    'Телефон: ' . $phoneFmt,
    'Время: ' . date('d.m.Y H:i'),
];
if ($utm) {
    $lines[] = '';
    $lines[] = 'Реклама:';
    $lines = array_merge($lines, $utm);
}
if ($page !== '') {
    $lines[] = '';
    $lines[] = 'Страница: ' . $page;
}
$text = implode("\n", $lines);

$sent = false;

// --- Telegram ---
if (!empty($config['telegram_token']) && !empty($config['telegram_chat_ids'])) {
    foreach ((array)$config['telegram_chat_ids'] as $chatId) {
        $ch = curl_init('https://api.telegram.org/bot' . $config['telegram_token'] . '/sendMessage');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => ['chat_id' => $chatId, 'text' => $text, 'disable_web_page_preview' => 'true'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
        ]);
        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($res !== false && $code === 200) {
            $sent = true;
        }
    }
}

// --- Почта ---
if (!empty($config['mail_to'])) {
    $host = preg_replace('/[^a-z0-9.\-]/i', '', $_SERVER['HTTP_HOST'] ?? 'localhost');
    $from = !empty($config['mail_from']) ? $config['mail_from'] : 'no-reply@' . $host;
    $subjectLine = '=?UTF-8?B?' . base64_encode("Заявка на пробник $exam: $phoneFmt") . '?=';
    $headers = implode("\r\n", [
        'From: IQ Center <' . $from . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ]);
    foreach ((array)$config['mail_to'] as $to) {
        if (@mail($to, $subjectLine, $text, $headers, '-f' . $from)) {
            $sent = true;
        }
    }
}

if (!$sent) {
    respond(false, null, 502);
}
respond(true);
